import { Request, Response, RequestHandler } from "express";
import prisma from "../config/db";
import logger from "../config/logger";
import messageRepository from "../repositories/message.repository";
import { uploadToCloudinary, getOptimizedUrl } from "../utils/cloudinary.util";
import { ResponseUtil, HttpStatus } from "../utils/response.util";
import multer from "multer";
import { ClientService } from "../services/client.service";
import QuotaService from "../services/quota.service";
import { MessageService } from "../services/message.service";

const upload = multer().single("media");

export const sendMessages: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) {
          ResponseUtil.badRequest(res, "Invalid file upload", [err.message]);
          reject(err);
        }
        resolve(undefined);
      });
    });

    const userId = req.user?.id;
    if (!userId) {
      ResponseUtil.unauthorized(res, "User authentication required");
      return;
    }

    const numbers =
      typeof req.body.numbers === "string"
        ? req.body.numbers.split(",").filter(Boolean)
        : [];
    const content = req.body.content;
    const media = req.file ? req.file.buffer : req.body.media;

    // Validasi input
    const validationErrors = [];
    if (numbers.length === 0)
      validationErrors.push("Phone numbers are required");
    if (!content) validationErrors.push("Message content is required");

    if (validationErrors.length > 0) {
      ResponseUtil.validationError(
        res,
        validationErrors,
        "Invalid message parameters"
      );
      return;
    }

    const existingClient = await prisma.client.findFirst({
      where: { userId },
    });

    if (!existingClient || existingClient.status !== "CONNECTED") {
      ResponseUtil.validationError(
        res,
        ["WhatsApp client must be connected to send messages"],
        "WhatsApp client not connected"
      );
      return;
    }

    const requiredQuota = numbers.length;
    const { balance } = await QuotaService.getAvailableBalance(userId);
    if (balance < requiredQuota) {
      ResponseUtil.conflict(res, "Insufficient quota balance", [
        `Required: ${requiredQuota}, Available: ${balance}`,
      ]);
      logger.warn(
        `Insufficient quota balance for user ${userId} (Required: ${requiredQuota}, Available: ${balance})`
      );
      return;
    }

    const whatsappInstance = ClientService.getInstance();
    if (!whatsappInstance) {
      ResponseUtil.error(
        res,
        "WhatsApp service unavailable",
        HttpStatus.SERVICE_UNAVAILABLE
      );
      return;
    }

    let cloudinaryUrl: string | undefined;
    if (media) {
      try {
        let uploadResult;
        if (Buffer.isBuffer(media)) {
          uploadResult = await uploadToCloudinary(media);
        } else if (typeof media === "string") {
          const response = await fetch(media);
          if (!response.ok) throw new Error("Failed to fetch media from URL");
          const buffer = Buffer.from(await response.arrayBuffer());
          uploadResult = await uploadToCloudinary(buffer);
        }

        if (uploadResult) {
          cloudinaryUrl = getOptimizedUrl(
            uploadResult.public_id,
            uploadResult.format
          );
        }
      } catch (error) {
        logger.error("Failed to process media:", error);
        ResponseUtil.validationError(
          res,
          [`Failed to process media: ${error}`],
          "Media processing error"
        );
        return;
      }
    }

    const messageRecords = await messageRepository.createMessages(
      existingClient.id,
      {
        numbers,
        content,
        media: cloudinaryUrl,
      }
    );

    const messageService = new MessageService();

    messageService.on("progress", (progress: BatchProgress) => {
      logger.info(
        `Progress: ${progress.processed}/${progress.total} (Success: ${progress.successful}, Failed: ${progress.failed})`
      );
    });

    messageService.processBatch(messageRecords, userId).catch((error) => {
      logger.error("Message processing error:", error);
    });

    ResponseUtil.success(res, `Processing ${numbers.length} messages`, {
      messageCount: numbers.length,
      hasMedia: !!cloudinaryUrl,
    });
  } catch (error: any) {
    logger.error(`Send messages error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};

export const getMessages: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      ResponseUtil.unauthorized(res, "User authentication required");
      return;
    }

    const status = req.query.status as MessageStatus | undefined;

    const client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      ResponseUtil.notFound(res, "Client not found");
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        clientId: client.id,
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
    });

    ResponseUtil.success(res, "Messages retrieved successfully", messages);
  } catch (error: any) {
    logger.error(`Get messages error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};
