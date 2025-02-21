import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import { puppeteerConfig } from "../config/puppeteer.config";
import { formatToWhatsAppNumber } from "../utils/phone.util";
import logger from "../config/logger";
import EventEmitter from "events";
import messageRepository from "../repositories/message.repository";
import QuotaService from "./quota.service";

export class MessageService extends EventEmitter {
  private client: Client;
  private readonly BATCH_SIZE = 20;
  private readonly DELAY_BETWEEN_BATCHES = 5000;

  constructor(userId: string, sessionPath: string) {
    super();
    this.client = new Client({
      restartOnAuthFail: true,
      authStrategy: new LocalAuth({
        clientId: userId,
        dataPath: sessionPath,
      }),
      puppeteer: puppeteerConfig,
    });
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  async sendMessage(
    number: string,
    content: string,
    mediaUrl?: string
  ): Promise<void> {
    const whatsappNumber = formatToWhatsAppNumber(number);

    const isRegistered = await this.validateNumber(whatsappNumber);
    if (!isRegistered) {
      throw new Error("Number not registered on WhatsApp");
    }

    // Ensure content is a single string
    const messageContent = content.toString();

    if (mediaUrl) {
      try {
        const media = await MessageMedia.fromUrl(mediaUrl, {
          unsafeMime: true,
        });
        await this.client.sendMessage(whatsappNumber, media, {
          caption: messageContent,
        });
      } catch (error) {
        throw new Error(`Failed to send media: ${error}`);
      }
    } else {
      await this.client.sendMessage(whatsappNumber, messageContent);
    }
  }

  async validateNumber(number: string): Promise<boolean> {
    try {
      return await this.client.isRegisteredUser(number);
    } catch (error) {
      logger.error(`Error validating number ${number}:`, error);
      return false;
    }
  }

  getClient(): Client {
    return this.client;
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
  }

  async logout(): Promise<void> {
    await this.client.logout();
  }

  async processBatch(messages: MessageRecord[], userId: string): Promise<void> {
    if (!userId) {
      throw new Error("userId is required for quota management");
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
            try {
              await this.sendMessage(
                message.number,
                message.content,
                message.mediaUrl ?? undefined
              );
              await messageRepository.updateMessageStatus(message.id, "SENT");
              successCount++;
            } catch (error: any) {
              await messageRepository.updateMessageStatus(
                message.id,
                "FAILED",
                error.message
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
}

export default MessageService;
