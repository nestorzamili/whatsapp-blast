import { Client, LocalAuth } from "whatsapp-web.js";
import prisma from "../config/db";
import logger from "../config/logger";
import qrcode from "qrcode-terminal";
import { puppeteerConfig } from "../config/puppeteer.config";
import EventEmitter from "events";
import { formatToWhatsAppNumber } from "../utils/phone.util";

export class WhatsAppService extends EventEmitter {
  private client: Client;
  private userId: string;
  private clientId: string;
  private sessionPath: string;
  private BATCH_SIZE = 20;

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

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.updateClientSession();

    this.client.on("qr", (qr) => {
      logger.info(`QR Code generated for client ${this.clientId}`);
      this.emit("qr", qr);
      qrcode.generate(qr, { small: true });
      this.updateClientStatus("INITIALIZING", qr);
    });

    this.client.on("ready", async () => {
      logger.info(`Client ${this.clientId} is ready`);
      this.emit("ready");
      await this.updateClientStatus("CONNECTED");
    });

    this.client.on("disconnected", async () => {
      logger.warn(`Client ${this.clientId} disconnected`);
      this.emit("disconnected");
      await this.updateClientStatus("DISCONNECTED");
    });
  }

  private async updateClientSession(): Promise<void> {
    try {
      await prisma.client.update({
        where: { id: this.clientId },
        data: { session: `${this.sessionPath}/session-${this.userId}` },
      });
    } catch (err) {
      logger.error("Failed to update session path:", err);
    }
  }

  private async updateClientStatus(
    status: "INITIALIZING" | "CONNECTED" | "DISCONNECTED",
    qrCode?: string
  ): Promise<void> {
    try {
      await prisma.client.update({
        where: { id: this.clientId },
        data: {
          status,
          lastActive: status === "CONNECTED" ? new Date() : undefined,
          lastQrCode: qrCode || null,
          session: status === "CONNECTED" ? await this.getSessionData() : null,
        },
      });
    } catch (err) {
      logger.error(`Failed to update client status to ${status}:`, err);
    }
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

  async sendBulkMessages(
    messages: { id: string; number: string; content: string }[]
  ): Promise<void> {
    const batches = this.splitIntoBatches(messages);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (msg) => {
          try {
            const whatsappNumber = formatToWhatsAppNumber(msg.number);
            const isRegistered = await this.validateNumber(whatsappNumber);

            if (!isRegistered) {
              await this.updateMessageStatus(
                msg.id,
                "FAILED",
                "Number not registered on WhatsApp"
              );
              return;
            }

            await this.client.sendMessage(whatsappNumber, msg.content);
            await this.updateMessageStatus(msg.id, "SENT");
          } catch (error: any) {
            logger.error(`Failed to send message to ${msg.number}:`, error);
            await this.updateMessageStatus(msg.id, "FAILED", error.message);
          }
        })
      );

      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(5000);
      }
    }
  }

  private async updateMessageStatus(
    messageId: string,
    status: "SENT" | "FAILED",
    error?: string
  ): Promise<void> {
    await prisma.message.update({
      where: { id: messageId },
      data: { status, error },
    });
  }

  private async validateNumber(number: string): Promise<boolean> {
    try {
      return await this.client.isRegisteredUser(number);
    } catch (error) {
      logger.error(`Error validating number ${number}:`, error);
      return false;
    }
  }

  private splitIntoBatches(
    messages: { id: string; number: string; content: string }[]
  ): { id: string; number: string; content: string }[][] {
    const batches: { id: string; number: string; content: string }[][] = [];
    for (let i = 0; i < messages.length; i += this.BATCH_SIZE) {
      batches.push(messages.slice(i, i + this.BATCH_SIZE));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async destroy() {
    try {
      await this.client.logout();
      await this.client.destroy();
      await prisma.client.update({
        where: { id: this.clientId },
        data: {
          status: "DISCONNECTED",
          session: null,
        },
      });
    } catch (error) {
      logger.error("Error destroying client:", error);
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
