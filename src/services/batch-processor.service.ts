import EventEmitter from "events";
import { WhatsAppService } from "./whatsapp.service";
import messageRepository from "../repositories/message.repository";

export class BatchProcessor extends EventEmitter {
  private readonly BATCH_SIZE = 20;
  private readonly DELAY_BETWEEN_BATCHES = 5000;

  constructor(private whatsappService: WhatsAppService) {
    super();
  }

  async processBatch(messages: MessageRecord[]): Promise<void> {
    const batches = this.splitIntoBatches(messages);
    const totalMessages = messages.length;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (message) => {
          try {
            await this.whatsappService.sendMessage(
              message.number,
              message.content,
              message.mediaUrl
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
