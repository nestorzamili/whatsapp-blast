import { Request, Response, RequestHandler } from "express";
import { WhatsAppService } from "../services/whatsapp.service";
import prisma from "../config/db";
import logger from "../config/logger";
import messageRepository from "../repositories/message.repository";
import { MessageStatus } from "@prisma/client";
import { BatchProcessor } from "../services/batch-processor.service";
import { uploadToCloudinary, getOptimizedUrl } from "../utils/cloudinary.util";
import multer from "multer";

const activeClients: Map<string, WhatsAppService> = new Map();

const upload = multer().single("media");

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
      instance?.handleLogout();
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
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) reject(err);
        resolve(undefined);
      });
    });

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

    const numbers = req.body.numbers?.split(",").filter(Boolean) || [];
    const content = req.body.content;
    const media = req.file ? req.file.buffer : req.body.media; // Single media field

    if (numbers.length === 0 || !content) {
      logger.error(
        "Invalid format: numbers array is required and content cannot be empty"
      );
      res.status(400).json({
        success: false,
        message:
          "Invalid format: numbers array is required and content cannot be empty",
      });
      return;
    }

    const whatsappInstance = activeClients.get(existingClient.id);
    if (!whatsappInstance) {
      logger.error("WhatsApp client not initialized");
      res.status(400).json({
        success: false,
        message: "WhatsApp client not initialized",
      });
      return;
    }

    let cloudinaryUrl: string | undefined;

    if (media) {
      try {
        if (Buffer.isBuffer(media)) {
          // Handle file upload
          const uploadResult = await uploadToCloudinary(media);
          cloudinaryUrl = getOptimizedUrl(uploadResult.public_id);
        } else if (typeof media === "string") {
          // Handle URL
          const response = await fetch(media);
          if (!response.ok) throw new Error("Failed to fetch media from URL");
          const buffer = Buffer.from(await response.arrayBuffer());
          const uploadResult = await uploadToCloudinary(buffer);
          cloudinaryUrl = getOptimizedUrl(uploadResult.public_id);
        }
      } catch (error) {
        logger.error("Failed to process media:", error);
        res.status(400).json({
          success: false,
          message: "Failed to process media",
          error: error,
        });
        return;
      }
    }

    const messageRecords = await messageRepository.createMessages(
      existingClient.id,
      {
        numbers,
        content,
        media: cloudinaryUrl, // Langsung kirim URL string
      }
    );

    const batchProcessor = new BatchProcessor(whatsappInstance);

    batchProcessor.on("progress", (progress: BatchProgress) => {
      logger.info(
        `Batch ${progress.currentBatch}/${progress.totalBatches} completed. Processed: ${progress.processed}/${progress.total} messages (Success: ${progress.successful}, Failed: ${progress.failed})`
      );
    });

    batchProcessor.processBatch(messageRecords).catch((error) => {
      logger.error("Message processing error:", error);
    });

    res.status(200).json({
      success: true,
      message: `Processing messages for ${numbers.length} recipients`,
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
      whatsappInstance.handleLogout();
      activeClients.delete(existingClient.id);
    }

    res.status(200).json({
      success: true,
      message: "WhatsApp client logout initiated",
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
