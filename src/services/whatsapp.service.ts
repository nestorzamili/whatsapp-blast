import { Client, LocalAuth } from "whatsapp-web.js";
import prisma from "../config/db";
import logger from "../config/logger";
import qrcode from "qrcode-terminal";
import { puppeteerConfig } from "../config/puppeteer.config";
import EventEmitter from "events";
import { formatToWhatsAppNumber } from "../utils/phone.util";
import fs from "fs/promises";
import path from "path";
import { FileSystemError } from "../types";

export class WhatsAppService extends EventEmitter {
  private client: Client;
  private userId: string;
  private clientId: string;
  private sessionPath: string;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000;

  constructor(userId: string, clientId: string) {
    super();
    this.userId = userId;
    this.clientId = clientId;
    this.sessionPath = `./sessions`;

    this.client = new Client({
      restartOnAuthFail: true,
      authStrategy: new LocalAuth({
        clientId: userId,
        dataPath: this.sessionPath,
      }),
      puppeteer: puppeteerConfig,
    });

    this.setupErrorHandlers();
    this.setupEventListeners();
    this.startIdleTimer();
  }

  private setupErrorHandlers(): void {
    process.on("unhandledRejection", async (reason) => {
      if (
        typeof reason === "string" &&
        (reason.includes("Protocol Error:") ||
          reason.includes("Target closed."))
      ) {
        logger.error(
          `Unhandled rejection for client ${this.clientId}:`,
          reason
        );
        await this.cleanupAndDestroy();
      }
    });

    process.on("uncaughtException", async (error) => {
      if (
        error.message.includes("Protocol Error:") ||
        error.message.includes("Target closed.")
      ) {
        logger.error(`Uncaught exception for client ${this.clientId}:`, error);
        await this.cleanupAndDestroy();
      }
    });
  }

  private async cleanupAndDestroy(): Promise<void> {
    try {
      await this.client.destroy();
      const sessionDir = path.join(this.sessionPath, `session-${this.userId}`);

      if (await fs.stat(sessionDir).catch(() => false)) {
        await fs.rm(sessionDir, { recursive: true, force: true });
        logger.info(`Session directory cleaned up for user ${this.userId}`);
      }
    } catch (error: unknown) {
      if (this.isFileSystemError(error) && error.code === "EBUSY") {
        logger.warn(
          `Resource busy, retrying cleanup for client ${this.clientId}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          await this.client.destroy();
        } catch (retryError: unknown) {
          logger.error(
            `Final cleanup attempt failed for client ${this.clientId}:`,
            this.isFileSystemError(retryError)
              ? retryError.message
              : "Unknown error"
          );
        }
      } else {
        logger.error(
          `Error during cleanup for client ${this.clientId}:`,
          this.isFileSystemError(error) ? error.message : "Unknown error"
        );
      }
    }
  }

  private isFileSystemError(error: unknown): error is FileSystemError {
    return error instanceof Error && "code" in error;
  }

  private startIdleTimer(): void {
    this.stopIdleTimer();
    this.idleTimer = setTimeout(() => {
      logger.info(`Client ${this.clientId} idle timeout reached`);
      this.handleIdle();
    }, this.IDLE_TIMEOUT);
  }

  private stopIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private resetIdleTimer(): void {
    this.startIdleTimer();
    prisma.client
      .update({
        where: { id: this.clientId },
        data: { lastActive: new Date() },
      })
      .catch((err) => {
        logger.error("Failed to update lastActive timestamp:", err);
      });
  }

  private async updateClient(data: ClientUpdate): Promise<void> {
    try {
      await prisma.client.update({
        where: { id: this.clientId },
        data,
      });
    } catch (err) {
      logger.error(`Failed to update client:`, err);
    }
  }

  private setupEventListeners(): void {
    this.updateClient({
      session: `${this.sessionPath}/session-${this.userId}`,
    });

    this.client.on("qr", (qr) => {
      logger.info(`QR Code generated for client ${this.clientId}`);
      this.emit("qr", qr);
      qrcode.generate(qr, { small: true });
      this.updateClient({
        status: "INITIALIZING",
        lastQrCode: qr,
      });
    });

    this.client.on("ready", async () => {
      logger.info(`Client ${this.clientId} is ready`);
      this.emit("ready");
      this.updateClient({
        status: "CONNECTED",
        lastActive: new Date(),
        session: await this.getSessionData(),
        lastQrCode: null,
      });
    });

    this.client.on("disconnected", async (reason: string) => {
      logger.warn(`Client ${this.clientId} disconnected. Reason: ${reason}`);
      this.emit("disconnected");
      this.stopIdleTimer();

      await this.updateClient({
        status: "DISCONNECTED",
        session: null,
      });

      if (reason === "NAVIGATION" || reason === "LOGOUT") {
        await this.cleanupAndDestroy();
      }
    });

    this.client.on("message", () => {
      this.resetIdleTimer();
    });

    this.client.on("error", (error) => {
      logger.error(`Client ${this.clientId} error:`, error);
      this.emit("error", error);
    });
  }

  async initialize() {
    try {
      await prisma.client.update({
        where: { id: this.clientId },
        data: { status: "INITIALIZING" },
      });

      logger.info("Starting WhatsApp client initialization...");
      await this.client.initialize();

      return true;
    } catch (error) {
      logger.error("Error initializing client:", error);
      await prisma.client.update({
        where: { id: this.clientId },
        data: { status: "DISCONNECTED" },
      });
      throw error;
    }
  }

  async sendMessage(number: string, content: string): Promise<void> {
    this.resetIdleTimer();
    const whatsappNumber = formatToWhatsAppNumber(number);

    const isRegistered = await this.validateNumber(whatsappNumber);
    if (!isRegistered) {
      throw new Error("Number not registered on WhatsApp");
    }

    await this.client.sendMessage(whatsappNumber, content);
  }

  async validateNumber(number: string): Promise<boolean> {
    try {
      return await this.client.isRegisteredUser(number);
    } catch (error) {
      logger.error(`Error validating number ${number}:`, error);
      return false;
    }
  }

  private handleIdle(): void {
    this.stopIdleTimer();
    this.client.destroy();
    this.updateClient({ status: "IDLE" }).catch((error) => {
      logger.error("Error updating client status to IDLE:", error);
    });
  }

  public async handleLogout(): Promise<void> {
    this.stopIdleTimer();
    try {
      await this.client.logout();
      await this.cleanupAndDestroy();
      await this.updateClient({
        status: "DISCONNECTED",
        session: null,
      });
    } catch (error) {
      logger.error(`Error during logout for client ${this.clientId}:`, error);
      throw error;
    }
  }

  async getSessionData(): Promise<string | null> {
    try {
      const state = await this.client.getState();
      if (state === "CONNECTED") {
        return `${this.sessionPath}/session-${this.userId}`;
      }
      return null;
    } catch (error) {
      logger.error("Error getting session data:", error);
      return null;
    }
  }

  async getState() {
    return this.client.getState();
  }
}

export default WhatsAppService;
