import { Request, Response, RequestHandler } from "express";
import { WhatsAppService } from "../services/whatsapp.service";
import prisma from "../config/db";
import logger from "../config/logger";

// Store active client instances
const activeClients: Map<string, WhatsAppService> = new Map();

export const initializeClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Find or create client record
    let client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          userId,
          status: "INITIALIZING",
        },
      });
    }

    // Check if client is already active
    if (activeClients.has(client.id)) {
      const instance = activeClients.get(client.id);
      const state = await instance?.getState();

      if (state === "CONNECTED") {
        res.status(400).json({
          success: false,
          message: "WhatsApp client already connected",
        });
        return;
      }

      // Cleanup existing instance
      instance?.removeAllListeners();
      await instance?.destroy();
      activeClients.delete(client.id);
    }

    // Create new WhatsApp instance
    const whatsappInstance = new WhatsAppService(userId, client.id);

    // Setup event listeners
    whatsappInstance.on("qr", async (qr: string) => {
      logger.info(`QR Code generated for client ${client?.id}`);
    });

    whatsappInstance.on("ready", () => {
      logger.info(`Client ${client?.id} is ready`);
    });

    // Store instance and start initialization
    activeClients.set(client.id, whatsappInstance);
    await whatsappInstance.initialize();

    res.status(200).json({
      success: true,
      message: "WhatsApp client initialization started",
      clientId: client.id,
    });
  } catch (error: any) {
    logger.error(`Initialize client error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to initialize WhatsApp client",
      error: error.message,
    });
  }
};

export const sendBatchMessages: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const existingClient = await prisma.client.findFirst({
      where: { userId },
    });

    if (!existingClient) {
      res.status(404).json({
        success: false,
        message: "Client not found",
      });
      return;
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        success: false,
        message: "Invalid messages format or empty array",
      });
      return;
    }

    const whatsappInstance = activeClients.get(existingClient.id);
    if (!whatsappInstance) {
      res.status(400).json({
        success: false,
        message: "WhatsApp client not initialized",
      });
      return;
    }

    const messagePromises = messages.map(async (msg) => {
      const dbMessage = await prisma.message.create({
        data: {
          clientId: existingClient.id,
          number: msg.number,
          content: msg.content,
          status: "PENDING",
        },
      });

      return whatsappInstance.sendMessage(
        dbMessage.id,
        msg.number,
        msg.content
      );
    });

    await Promise.all(messagePromises);
    res.status(200).json({
      success: true,
      message: "Batch messages processing started",
    });
  } catch (error: any) {
    logger.error(`Send batch messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to send batch messages",
      error: error.message,
    });
  }
};

export const logoutClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const existingClient = await prisma.client.findFirst({
      where: { userId },
    });

    if (!existingClient) {
      res.status(404).json({
        success: false,
        message: "Client not found",
      });
      return;
    }

    const whatsappInstance = activeClients.get(existingClient.id);
    if (!whatsappInstance) {
      res.status(400).json({
        success: false,
        message: "WhatsApp client not initialized",
      });
      return;
    }

    await whatsappInstance.destroy();
    activeClients.delete(existingClient.id);

    res.status(200).json({
      success: true,
      message: "WhatsApp client logged out successfully",
    });
  } catch (error: any) {
    logger.error(`Logout client error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to logout WhatsApp client",
      error: error.message,
    });
  }
};
