import { MessageMedia } from "whatsapp-web.js";
import { formatToWhatsAppNumber } from "../utils/phone.util";
import logger from "../config/logger";
import EventEmitter from "events";
import messageRepository from "../repositories/message.repository";
import QuotaService from "./quota.service";
import { ClientService } from "./client.service";
import { HttpStatus } from "../utils/response.util";

export class MessageService extends EventEmitter {
  private readonly BATCH_SIZE = 20;
  private readonly DELAY_BETWEEN_BATCHES = 5000;
  private readonly RETRY_DELAY = 3000;
  private readonly MAX_RETRIES = 3;
  private readonly PDF_SEND_DELAY = 5000;

  private createError(message: string, statusCode: HttpStatus): ServiceError {
    return { message, statusCode };
  }

  private async sendMessage(
    userId: string,
    number: string,
    content: string,
    mediaUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const whatsappNumber = formatToWhatsAppNumber(number);
      const isRegistered = await this.validateNumber(userId, whatsappNumber);

      if (!isRegistered) {
        return {
          success: false,
          error: "Number not registered on WhatsApp",
        };
      }

      const client = await ClientService.getInstance().getClient(userId);
      if (!client) {
        return {
          success: false,
          error: "WhatsApp client not connected",
        };
      }

      if (mediaUrl) {
        try {
          const media = await MessageMedia.fromUrl(mediaUrl, {
            unsafeMime: true,
          });
          const isPdf =
            mediaUrl.toLowerCase().endsWith(".pdf") ||
            mediaUrl.includes("/pdf/") ||
            mediaUrl.includes("application/pdf");

          if (isPdf) {
            const sent = await this.sendPdfWithRetry(
              whatsappNumber,
              { content, media: mediaUrl },
              client
            );
            if (!sent) {
              return {
                success: false,
                error: "Failed to send PDF after retries",
              };
            }
          } else {
            await client.sendMessage(whatsappNumber, media, {
              caption: content,
            });
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to send media: ${error}`,
          };
        }
      } else {
        await client.sendMessage(whatsappNumber, content);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async validateNumber(userId: string, number: string): Promise<boolean> {
    try {
      const client = await ClientService.getInstance().getClient(userId);
      if (!client) {
        throw new Error("WhatsApp client not connected");
      }
      return await client.isRegisteredUser(number);
    } catch (error) {
      logger.error(`Error validating number ${number}:`, error);
      return false;
    }
  }

  async processBatch(messages: MessageRecord[], userId: string): Promise<void> {
    if (!userId) {
      throw this.createError(
        "userId is required for quota management",
        HttpStatus.BAD_REQUEST
      );
    }

    const totalMessages = messages.length;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    try {
      logger.info(
        `Reserving quota for ${totalMessages} messages - UserId: ${userId}`
      );
      await QuotaService.reserveQuota(userId, totalMessages);

      const batches = this.splitIntoBatches(messages);
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (message) => {
            const result = await this.sendMessage(
              userId,
              message.number,
              message.content,
              message.mediaUrl ?? undefined
            );

            if (result.success) {
              await messageRepository.updateMessageStatus(message.id, "SENT");
              successCount++;
            } else {
              await messageRepository.updateMessageStatus(
                message.id,
                "FAILED",
                result.error
              );
              failedCount++;
            }
            processedCount++;
          })
        );

        this.emitProgress(
          totalMessages,
          processedCount,
          successCount,
          failedCount,
          batches.length
        );

        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(this.DELAY_BETWEEN_BATCHES);
        }
      }

      await QuotaService.finalizeQuotaUsage(userId, successCount);
    } catch (error) {
      if (processedCount > 0) {
        await QuotaService.finalizeQuotaUsage(userId, successCount);
      }
      throw error;
    }
  }

  private splitIntoBatches(messages: MessageRecord[]): MessageRecord[][] {
    const batches: MessageRecord[][] = [];
    for (let i = 0; i < messages.length; i += this.BATCH_SIZE) {
      batches.push(messages.slice(i, i + this.BATCH_SIZE));
    }
    return batches;
  }

  private emitProgress(
    total: number,
    processed: number,
    successful: number,
    failed: number,
    totalBatches: number
  ): void {
    this.emit("progress", {
      total,
      processed,
      successful,
      failed,
      currentBatch: Math.ceil(processed / this.BATCH_SIZE),
      totalBatches,
    } as BatchProgress);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async sendPdfWithRetry(
    chatId: string,
    message: { content: string; media: string },
    client: any,
    retryCount = 0
  ): Promise<boolean> {
    try {
      const mediaMessage = await this.createMediaMessage(chatId, message);

      await new Promise((resolve) => setTimeout(resolve, this.PDF_SEND_DELAY));

      await client.sendMessage(chatId, mediaMessage);
      return true;
    } catch (error) {
      logger.error(
        `Failed to send PDF message (attempt ${retryCount + 1}):`,
        error
      );

      if (retryCount < this.MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        return this.sendPdfWithRetry(chatId, message, client, retryCount + 1);
      }

      return false;
    }
  }

  private async createMediaMessage(
    chatId: string,
    message: { content: string; media: string }
  ) {
    const media = await MessageMedia.fromUrl(message.media);
    return {
      media,
      caption: message.content,
      sendMediaAsDocument: message.media.toLowerCase().endsWith(".pdf"),
    };
  }
}

export default MessageService;
