import { Request, Response, RequestHandler } from "express";
import { WhatsAppService } from "../services/whatsapp.service";
import prisma from "../config/db";
import logger from "../config/logger";
import messageRepository from "../repositories/message.repository";
import { IMessagePayload } from "../interfaces/message.interface";
import { MessageStatus } from "@prisma/client";

const activeClients: Map<string, WhatsAppService> = new Map();

export const initializeClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

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

      instance?.removeAllListeners();
      await instance?.destroy();
      activeClients.delete(client.id);
    }

    const whatsappInstance = new WhatsAppService(userId, client.id);
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
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const existingClient = await prisma.client.findFirst({
      where: { userId },
    });

    if (!existingClient || existingClient.status !== "CONNECTED") {
      res.status(400).json({
        success: false,
        message: "WhatsApp client not connected",
      });
      return;
    }

    const messages = req.body.messages as IMessagePayload[];
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

    const messageRecords = await messageRepository.createMessages(
      existingClient.id,
      messages
    );

    whatsappInstance.sendBulkMessages(messageRecords).catch((error) => {
      logger.error("Message processing error:", error);
    });

    res.status(200).json({
      success: true,
      message: `Processing ${messages.length} messages`,
      messageIds: messageRecords.map((m) => m.id),
    });
  } catch (error: any) {
    logger.error(`Send batch messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to send messages",
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
      res.status(401).json({ success: false, message: "Unauthorized" });
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
    if (whatsappInstance) {
      await whatsappInstance.destroy();
      activeClients.delete(existingClient.id);
    }

    await prisma.client.update({
      where: { id: existingClient.id },
      data: {
        status: "DISCONNECTED",
        session: null,
        lastActive: new Date(),
      },
    });

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

export const getClientStatus: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const client = await prisma.client.findFirst({
      where: { userId },
      select: {
        id: true,
        status: true,
        lastActive: true,
        lastQrCode: true,
      },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Client not found",
      });
      return;
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    logger.error(`Get client status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get client status",
      error: error.message,
    });
  }
};

export const getMessages: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as MessageStatus | undefined;

    const client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Client not found",
      });
      return;
    }

    const [messages, total] = await prisma.$transaction([
      prisma.message.findMany({
        where: {
          clientId: client.id,
          ...(status && { status }),
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.count({
        where: {
          clientId: client.id,
          ...(status && { status }),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Get messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get messages",
      error: error.message,
    });
  }
};

export const getMessageStatus: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const messageId = req.params.id;
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        client: {
          userId,
        },
      },
    });

    if (!message) {
      res.status(404).json({
        success: false,
        message: "Message not found",
      });
      return;
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    logger.error(`Get message status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get message status",
      error: error.message,
    });
  }
};
