import { MessageService } from "./message.service";
import prisma from "../config/db";
import logger from "../config/logger";
import qrcode from "qrcode-terminal";
import path from "path";
import fs from "fs/promises";

export class ClientService {
  private static instance: ClientService;
  private activeClients: Map<string, MessageService>;
  private inactivityTimers: Map<string, NodeJS.Timeout>;
  private readonly INACTIVITY_TIMEOUT = 60 * 60 * 1000;
  private readonly SESSION_BASE_PATH = "./sessions";
  private qrGenerationCounts: Map<string, number>;
  private readonly MAX_QR_GENERATION = 3;

  private constructor() {
    this.activeClients = new Map();
    this.inactivityTimers = new Map();
    this.qrGenerationCounts = new Map();
  }

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  async connectClient(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    let client = await prisma.client.findFirst({ where: { userId } });

    if (!client) {
      try {
        client = await prisma.client.create({
          data: {
            userId,
            status: "INITIALIZING",
            lastActive: new Date(),
          },
        });
      } catch (error) {
        logger.error(`Failed to create client:`, error);
        throw new Error("Failed to create WhatsApp client");
      }
    }

    if (this.activeClients.has(client.id) && client.status === "CONNECTED") {
      return client.id;
    }

    const sessionPath = this.SESSION_BASE_PATH;
    const whatsappInstance = new MessageService(userId, sessionPath);
    this.activeClients.set(client.id, whatsappInstance);

    const Client = whatsappInstance.getClient();

    Client.on("qr", (qr) => {
      const qrCount = this.qrGenerationCounts.get(client.id) || 0;
      this.qrGenerationCounts.set(client.id, qrCount + 1);

      if (qrCount >= this.MAX_QR_GENERATION) {
        this.handleQrLimit(client.id);
        return;
      }

      logger.info(`QR Code generated for client ${client.id}`);
      qrcode.generate(qr, { small: true });
      this.updateClientStatus(client.id, {
        status: "INITIALIZING",
        lastQrCode: qr,
        session: null,
      });
    });

    Client.on("ready", () => {
      logger.info(`Client ${client.id} is ready`);
      this.updateClientStatus(client.id, {
        status: "CONNECTED",
        lastActive: new Date(),
        lastQrCode: null,
        session: `session-${userId}`,
      });
      this.startInactivityTimer(client.id);
    });

    Client.on("disconnected", async (reason) => {
      logger.warn(`Client ${client.id} disconnected. Reason: ${reason}`);
      this.stopInactivityTimer(client.id);
      await this.updateClientStatus(client.id, {
        status: "DISCONNECTED",
      });

      if (reason === "LOGOUT") {
        await this.cleanupSession(userId);
      }
    });

    Client.on("message", () => {
      this.resetInactivityTimer(client.id);
    });

    if (client.status === "DISCONNECTED") {
      logger.info(`Reconnecting client ${client.id}`);
      await whatsappInstance.initialize();
    } else {
      await whatsappInstance.initialize();
    }

    return client.id;
  }

  async disconnectClient(userId: string): Promise<void> {
    const client = await prisma.client.findFirst({ where: { userId } });
    if (!client) return;

    const instance = this.activeClients.get(client.id);
    if (instance) {
      this.stopInactivityTimer(client.id);
      await instance.destroy();
      this.activeClients.delete(client.id);

      await this.updateClientStatus(client.id, {
        status: "DISCONNECTED",
        lastQrCode: null,
      });
    }
  }

  async deleteDevice(userId: string): Promise<void> {
    const client = await prisma.client.findFirst({ where: { userId } });
    if (!client) return;

    const instance = this.activeClients.get(client.id);
    if (instance) {
      this.stopInactivityTimer(client.id);
      await instance.logout();
      await instance.destroy();
      await this.cleanupSession(userId);
      this.activeClients.delete(client.id);

      await this.updateClientStatus(client.id, {
        status: "LOGOUT",
        session: null,
      });
    }
  }

  private startInactivityTimer(clientId: string): void {
    this.stopInactivityTimer(clientId);
    this.inactivityTimers.set(
      clientId,
      setTimeout(() => this.handleInactivity(clientId), this.INACTIVITY_TIMEOUT)
    );
  }

  private stopInactivityTimer(clientId: string): void {
    const timer = this.inactivityTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(clientId);
    }
  }

  private resetInactivityTimer(clientId: string): void {
    this.startInactivityTimer(clientId);
    this.updateClientStatus(clientId, { lastActive: new Date() });
  }

  private async handleInactivity(clientId: string): Promise<void> {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (client) {
      await this.disconnectClient(client.userId);
    }
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

  private async handleQrLimit(clientId: string): Promise<void> {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (client) {
      logger.warn(
        `QR Code generation limit reached for client ${clientId}. Disconnecting...`
      );
      await this.disconnectClient(client.userId);
      await this.cleanupSession(client.userId);
      this.qrGenerationCounts.delete(clientId);
    }
  }

  getWhatsAppInstance(clientId: string): MessageService | undefined {
    return this.activeClients.get(clientId);
  }
}

export default ClientService.getInstance();
