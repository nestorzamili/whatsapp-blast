import { WhatsAppService } from "./whatsapp.service";
import prisma from "../config/db";
import logger from "../config/logger";
import qrcode from "qrcode-terminal";
import path from "path";
import fs from "fs/promises";

export class ClientService {
  private static instance: ClientService;
  private activeClients: Map<string, WhatsAppService>;
  private idleTimers: Map<string, NodeJS.Timeout>;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000;
  private readonly SESSION_BASE_PATH = "./sessions";

  private constructor() {
    this.activeClients = new Map();
    this.idleTimers = new Map();
  }

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  async initializeClient(userId: string): Promise<string> {
    let client = await prisma.client.findFirst({ where: { userId } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          userId,
          status: "INITIALIZING",
          lastActive: new Date(),
        },
      });
    }

    // Cleanup existing instance if any
    if (this.activeClients.has(client.id)) {
      await this.logoutClient(userId);
    }

    const sessionPath = this.SESSION_BASE_PATH;
    const whatsappInstance = new WhatsAppService(userId, sessionPath);
    this.activeClients.set(client.id, whatsappInstance);

    // Setup event listeners
    const wClient = whatsappInstance.getClient();

    wClient.on("qr", (qr) => {
      logger.info(`QR Code generated for client ${client.id}`);
      qrcode.generate(qr, { small: true });
      this.updateClientStatus(client.id, {
        status: "INITIALIZING",
        lastQrCode: qr,
      });
    });

    wClient.on("ready", () => {
      logger.info(`Client ${client.id} is ready`);
      this.updateClientStatus(client.id, {
        status: "CONNECTED",
        lastActive: new Date(),
        lastQrCode: null,
      });
      this.startIdleTimer(client.id);
    });

    wClient.on("disconnected", async (reason) => {
      logger.warn(`Client ${client.id} disconnected. Reason: ${reason}`);
      this.stopIdleTimer(client.id);
      await this.updateClientStatus(client.id, {
        status: "DISCONNECTED",
        session: null,
      });

      if (
        ["NAVIGATION_TIMEOUT", "DISCONNECTED"].includes(reason) ||
        reason === "LOGOUT"
      ) {
        await this.cleanupSession(userId);
      }
    });

    wClient.on("message", () => {
      this.resetIdleTimer(client.id);
    });

    await whatsappInstance.initialize();
    return client.id;
  }

  private async updateClientStatus(clientId: string, data: any): Promise<void> {
    try {
      await prisma.client.update({
        where: { id: clientId },
        data,
      });
    } catch (error) {
      logger.error(`Failed to update client status:`, error);
    }
  }

  private startIdleTimer(clientId: string): void {
    this.stopIdleTimer(clientId);
    this.idleTimers.set(
      clientId,
      setTimeout(() => this.handleIdle(clientId), this.IDLE_TIMEOUT)
    );
  }

  private stopIdleTimer(clientId: string): void {
    const timer = this.idleTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(clientId);
    }
  }

  private resetIdleTimer(clientId: string): void {
    this.startIdleTimer(clientId);
    this.updateClientStatus(clientId, { lastActive: new Date() });
  }

  private async handleIdle(clientId: string): Promise<void> {
    const instance = this.activeClients.get(clientId);
    if (instance) {
      await instance.destroy();
      this.activeClients.delete(clientId);
      this.updateClientStatus(clientId, { status: "IDLE" });
    }
  }

  private async cleanupSession(userId: string): Promise<void> {
    const sessionDir = path.join(this.SESSION_BASE_PATH, `session-${userId}`);
    try {
      if (await fs.stat(sessionDir).catch(() => false)) {
        await fs.rm(sessionDir, { recursive: true, force: true });
        logger.info(`Session directory cleaned up for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up session:`, error);
    }
  }

  async logoutClient(userId: string): Promise<void> {
    const client = await prisma.client.findFirst({ where: { userId } });
    if (!client) return;

    const instance = this.activeClients.get(client.id);
    if (instance) {
      this.stopIdleTimer(client.id);
      await instance.logout();
      await instance.destroy();
      await this.cleanupSession(userId);
      this.activeClients.delete(client.id);

      await this.updateClientStatus(client.id, {
        status: "DISCONNECTED",
        session: null,
      });
    }
  }

  getWhatsAppInstance(clientId: string): WhatsAppService | undefined {
    return this.activeClients.get(clientId);
  }
}

export default ClientService.getInstance();
