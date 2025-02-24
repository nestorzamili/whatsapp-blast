import prisma from "../config/db";
import logger from "../config/logger";
import qrcode from "qrcode-terminal";
import path from "path";
import fs from "fs/promises";
import { Client, LocalAuth } from "whatsapp-web.js";
import { puppeteerConfig } from "../config/puppeteer.config";
import EventEmitter from "events";

enum ClientStatus {
  DISCONNECTED = "DISCONNECTED",
  CONNECTED = "CONNECTED",
  INITIALIZING = "INITIALIZING",
  LOGOUT = "LOGOUT",
}

interface ClientUpdateData {
  status?: ClientStatus;
  lastQrCode?: string | null;
  lastActive?: Date | null;
  session?: string | null;
}

enum DisconnectReason {
  QR_LIMIT = "QR_LIMIT",
  INACTIVITY = "INACTIVITY",
  USER_DISCONNECT = "USER_DISCONNECT",
  DEVICE_DELETED = "DEVICE_DELETED",
  AUTH_FAILURE = "AUTH_FAILURE",
}

interface DisconnectOptions {
  reason: DisconnectReason;
  clearSession: boolean;
}

export class ClientService extends EventEmitter {
  private static instance: ClientService;
  private readonly activeClients = new Map<string, Client>();
  private readonly inactivityTimers = new Map<string, NodeJS.Timeout>();
  private readonly qrGenerationCounts = new Map<string, number>();
  private isCleaningUp = false;

  private readonly CONFIG = {
    INACTIVITY_TIMEOUT: 60 * 60 * 1000,
    SESSION_BASE_PATH: "./sessions",
    MAX_QR_GENERATION: 3,
  } as const;

  private constructor() {
    super();
    this.setupCleanupHandlers();
  }

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  private setupCleanupHandlers(): void {
    process.on("SIGTERM", () => this.handleExit());
    process.on("SIGINT", () => this.handleExit());
    process.on("beforeExit", () => this.handleExit());
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception: ", err);
      this.handleExit();
    });
  }

  private async cleanupPuppeteer(): Promise<void> {
    for (const client of this.activeClients.values()) {
      if (client.pupBrowser) {
        try {
          await client.pupBrowser.close();
        } catch (error) {
          logger.error("Failed to close Puppeteer browser:", error);
        }
      }
    }
  }

  private async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    const cleanupPromises = Array.from(this.activeClients.entries()).map(
      async ([clientId, client]) => {
        try {
          await client.destroy();
          this.activeClients.delete(clientId);
          this.stopInactivityTimer(clientId);
        } catch (error) {
          logger.error(`Failed to cleanup client ${clientId}:`, error);
        }
      }
    );

    await Promise.allSettled(cleanupPromises);
    await this.cleanupPuppeteer();
  }

  private async handleExit(): Promise<void> {
    await this.cleanup();
    process.exit(0);
  }

  private createClient(userId: string): Client {
    return new Client({
      restartOnAuthFail: true,
      takeoverOnConflict: true,
      authStrategy: new LocalAuth({
        clientId: userId,
        dataPath: this.CONFIG.SESSION_BASE_PATH,
      }),
      puppeteer: puppeteerConfig,
    });
  }

  private async setupClientEventListeners(
    whatsappInstance: Client,
    clientId: string,
    userId: string
  ): Promise<void> {
    this.activeClients.set(clientId, whatsappInstance);

    whatsappInstance
      .on("qr", async (qr) => {
        await this.handleQrGeneration(clientId, qr);
      })
      .on("ready", async () => {
        await this.handleClientReady(clientId, whatsappInstance, userId);
      })
      .on("disconnected", async (reason) => {
        await this.handleDisconnection(clientId, userId, {
          reason: DisconnectReason.USER_DISCONNECT,
          clearSession: false,
        });
      })
      .on("message", () => {
        this.resetInactivityTimer(clientId);
      })
      .on("auth_failure", async () => {
        await this.handleAuthFailure(clientId, userId);
      });
  }

  private async handleQrGeneration(
    clientId: string,
    qr: string
  ): Promise<void> {
    const qrCount = (this.qrGenerationCounts.get(clientId) || 0) + 1;
    this.qrGenerationCounts.set(clientId, qrCount);

    if (qrCount >= this.CONFIG.MAX_QR_GENERATION) {
      logger.warn(
        `QR limit reached for client ${clientId}, starting cleanup...`
      );
      await this.handleQrLimit(clientId);
      return;
    }

    logger.info(
      `QR Code generated for client ${clientId} (Attempt: ${qrCount})`
    );
    qrcode.generate(qr, { small: true });

    await this.updateClientStatus(clientId, {
      status: ClientStatus.INITIALIZING,
      lastQrCode: qr,
      session: null,
    });
  }

  private async handleClientReady(
    clientId: string,
    instance: Client,
    userId: string
  ): Promise<void> {
    logger.info(`Client ${clientId} is ready`);
    this.activeClients.set(clientId, instance);

    try {
      await this.updateClientStatus(clientId, {
        status: ClientStatus.CONNECTED,
        lastActive: new Date(),
        lastQrCode: null,
        session: `session-${userId}`,
      });

      this.startInactivityTimer(clientId);
      this.qrGenerationCounts.delete(clientId);
      this.emit("client.ready", clientId);
    } catch (error) {
      logger.error(`Failed to handle client ready state:`, error);
      this.activeClients.delete(clientId);
      throw error;
    }
  }

  private async handleDisconnection(
    clientId: string,
    userId: string,
    options: DisconnectOptions
  ): Promise<void> {
    const { reason, clearSession } = options;
    logger.warn(`Client ${clientId} disconnected. Reason: ${reason}`);

    try {
      this.stopInactivityTimer(clientId);
      await this.safeDestroyInstance(clientId);
      await this.updateClientStatus(clientId, {
        status: ClientStatus.DISCONNECTED,
        lastQrCode: null,
        lastActive: new Date(),
        session: clearSession ? null : `session-${userId}`,
      });

      if (clearSession) {
        await this.cleanupSession(userId);
      }

      this.qrGenerationCounts.delete(clientId);
      this.emit("client.disconnected", { clientId, reason });
    } catch (error) {
      logger.error(
        `Error handling disconnection for client ${clientId}:`,
        error
      );
      throw error;
    }
  }

  private async handleAuthFailure(
    clientId: string,
    userId: string
  ): Promise<void> {
    await this.handleDisconnection(clientId, userId, {
      reason: DisconnectReason.AUTH_FAILURE,
      clearSession: true,
    });
  }

  private async checkExistingSession(userId: string): Promise<boolean> {
    const sessionDir = path.join(
      this.CONFIG.SESSION_BASE_PATH,
      `session-${userId}`
    );
    try {
      const stats = await fs.stat(sessionDir);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  async connectClient(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    let client = await this.getOrCreateClientRecord(userId);

    if (this.isClientActive(client.id)) {
      logger.debug(
        `Client ${client.id} is already active, returning existing instance`
      );
      return client.id;
    }

    // Check for existing session
    const hasExistingSession = await this.checkExistingSession(userId);
    if (!hasExistingSession) {
      logger.info(
        `No existing session found for user ${userId}, creating new session`
      );
      await this.updateClientStatus(client.id, {
        status: ClientStatus.INITIALIZING,
        session: null,
      });
    } else {
      logger.info(`Found existing session for user ${userId}`);
      await this.updateClientStatus(client.id, {
        status: ClientStatus.INITIALIZING,
        session: `session-${userId}`,
      });
    }

    const whatsappInstance = this.createClient(userId);
    logger.debug(`Created new WhatsApp instance for client ${client.id}`);

    // Setup listeners sebelum initialize
    await this.setupClientEventListeners(whatsappInstance, client.id, userId);
    logger.debug(`Event listeners setup completed for client ${client.id}`);

    try {
      logger.info(`Initializing WhatsApp client for user ${userId}`);
      await whatsappInstance.initialize();
      logger.debug(`WhatsApp instance initialized successfully`);
      return client.id;
    } catch (error) {
      // Hapus instance jika initialization gagal
      this.activeClients.delete(client.id);
      logger.error(`Failed to initialize client:`, error);
      await this.handleDisconnection(client.id, userId, {
        reason: DisconnectReason.AUTH_FAILURE,
        clearSession: true,
      });
      throw error;
    }
  }

  private async getOrCreateClientRecord(userId: string) {
    const existingClient = await prisma.client.findFirst({ where: { userId } });
    if (existingClient) return existingClient;

    try {
      return await prisma.client.create({
        data: {
          userId,
          status: ClientStatus.INITIALIZING,
          lastActive: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Failed to create client record:`, error);
      throw new Error("Failed to create WhatsApp client record");
    }
  }

  private isClientActive(clientId: string): boolean {
    const instance = this.activeClients.get(clientId);
    const hasInstance = !!instance;
    return hasInstance;
  }

  async disconnectClient(userId: string): Promise<void> {
    const clientRecord = await prisma.client.findFirst({ where: { userId } });
    if (!clientRecord) return;

    await this.handleDisconnection(clientRecord.id, userId, {
      reason: DisconnectReason.USER_DISCONNECT,
      clearSession: false,
    });
  }

  async deleteDevice(userId: string): Promise<void> {
    const client = await prisma.client.findFirst({ where: { userId } });
    if (!client) return;

    const instance = this.activeClients.get(client.id);
    if (!instance) return;

    try {
      this.stopInactivityTimer(client.id);
      await instance.logout();
      await this.handleDisconnection(client.id, userId, {
        reason: DisconnectReason.DEVICE_DELETED,
        clearSession: true,
      });
      this.emit("client.deleted", client.id);
    } catch (error) {
      logger.error(`Error deleting device for client ${client.id}:`, error);
      throw error;
    }
  }

  private async updateClientStatus(
    clientId: string,
    updateData: Partial<ClientUpdateData>
  ): Promise<void> {
    try {
      const sanitizedData: ClientUpdateData = {};

      if (
        updateData.status &&
        Object.values(ClientStatus).includes(updateData.status)
      ) {
        sanitizedData.status = updateData.status;
      }

      if ("lastQrCode" in updateData) {
        sanitizedData.lastQrCode = updateData.lastQrCode;
      }

      if ("lastActive" in updateData) {
        sanitizedData.lastActive = updateData.lastActive;
      }

      if ("session" in updateData) {
        sanitizedData.session = updateData.session;
      }

      await prisma.client.update({
        where: { id: clientId },
        data: sanitizedData as any,
      });

      logger.info(`Successfully updated status for client ${clientId}`);
    } catch (error) {
      logger.error(`Failed to update client ${clientId} status:`, {
        error,
        updateData,
        clientId,
      });
      throw error;
    }
  }

  private startInactivityTimer(clientId: string): void {
    this.stopInactivityTimer(clientId);
    const timer = setTimeout(
      () => this.handleInactivity(clientId),
      this.CONFIG.INACTIVITY_TIMEOUT
    );
    this.inactivityTimers.set(clientId, timer);
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
    this.updateClientStatus(clientId, { lastActive: new Date() }).catch(
      (error) => logger.error("Failed to update last active timestamp:", error)
    );
  }

  private async handleInactivity(clientId: string): Promise<void> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) return;

    await this.handleDisconnection(client.id, client.userId, {
      reason: DisconnectReason.INACTIVITY,
      clearSession: false,
    });
  }

  private async safeDestroyInstance(clientId: string): Promise<void> {
    const instance = this.activeClients.get(clientId);
    if (!instance) {
      logger.debug(`No active instance found for client ${clientId}`);
      return;
    }

    try {
      logger.debug(`Attempting to destroy instance for client ${clientId}`);
      await instance.destroy();
      logger.info(`Instance destroyed successfully for client ${clientId}`);

      // Remove from active clients after successful destroy
      this.activeClients.delete(clientId);
      logger.debug(`Removed client ${clientId} from active clients map`);
    } catch (error: any) {
      if (error.code === "EBUSY") {
        logger.warn(
          `EBUSY error while destroying instance for client ${clientId}`
        );

        for (const delay of [2000, 5000]) {
          try {
            await new Promise((resolve) => setTimeout(resolve, delay));
            await instance.destroy();
            this.activeClients.delete(clientId);
            return;
          } catch (retryError: any) {
            if (retryError.code !== "EBUSY") throw retryError;
          }
        }
        throw error;
      }
      throw error;
    }
  }

  private async cleanupSession(userId: string): Promise<void> {
    const sessionDir = path.join(
      this.CONFIG.SESSION_BASE_PATH,
      `session-${userId}`
    );
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
    if (!client) return;

    await this.handleDisconnection(client.id, client.userId, {
      reason: DisconnectReason.QR_LIMIT,
      clearSession: true,
    });
  }

  async getClient(userId: string): Promise<Client | undefined> {
    try {
      const clientRecord = await prisma.client.findFirst({
        where: {
          userId,
          status: ClientStatus.CONNECTED,
        },
      });

      return clientRecord ? this.activeClients.get(clientRecord.id) : undefined;
    } catch (error) {
      logger.error(`Error getting client for user ${userId}:`, error);
      throw error;
    }
  }
}

export default ClientService.getInstance();
