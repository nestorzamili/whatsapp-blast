import { Client, LocalAuth } from "whatsapp-web.js";
import prisma from "../config/db";
import logger from "../config/logger";
import qrcode from "qrcode-terminal";
import { puppeteerConfig } from "../config/puppeteer.config";
import EventEmitter from "events";

export class WhatsAppService extends EventEmitter {
  private client: Client;
  private userId: string;
  private clientId: string;
  private sessionPath: string;

  constructor(userId: string, clientId: string) {
    super();
    this.userId = userId;
    this.clientId = clientId;
    this.sessionPath = `./sessions`; // Ubah path dasar

    this.client = new Client({
      restartOnAuthFail: true,
      authStrategy: new LocalAuth({
        clientId: userId,
        dataPath: this.sessionPath,
      }),
      puppeteer: puppeteerConfig,
    });

    // Update session path in database
    prisma.client
      .update({
        where: { id: this.clientId },
        data: { session: `${this.sessionPath}/session-${userId}` },
      })
      .catch((err) => logger.error("Failed to update session path:", err));

    // Setup event listeners
    this.client.on("qr", (qr) => {
      logger.info("New QR Code received");
      this.emit("qr", qr);
      qrcode.generate(qr, { small: true });

      // Update QR in database
      prisma.client
        .update({
          where: { id: this.clientId },
          data: {
            status: "INITIALIZING",
            lastQrCode: qr,
          },
        })
        .catch((err) => logger.error("Failed to update QR code:", err));
    });

    this.client.on("ready", async () => {
      logger.info("Client is ready!");
      this.emit("ready");

      await prisma.client.update({
        where: { id: this.clientId },
        data: {
          status: "CONNECTED",
          lastActive: new Date(),
          lastQrCode: null,
        },
      });
    });

    this.client.on("disconnected", async () => {
      logger.warn("Client disconnected");
      this.emit("disconnected");

      await prisma.client.update({
        where: { id: this.clientId },
        data: {
          status: "DISCONNECTED",
          lastQrCode: null,
        },
      });
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

  async sendMessage(messageId: string, number: string, content: string) {
    try {
      const formattedNumber = number.includes("@c.us")
        ? number
        : `${number}@c.us`;
      await this.client.sendMessage(formattedNumber, content);

      await prisma.message.update({
        where: { id: messageId },
        data: { status: "SENT" },
      });

      return true;
    } catch (error) {
      logger.error(`Failed to send message to ${number}:`, error);

      await prisma.message.update({
        where: { id: messageId },
        data: { status: "FAILED" },
      });

      return false;
    }
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

  async getState() {
    return this.client.getState();
  }
}

export default WhatsAppService;
