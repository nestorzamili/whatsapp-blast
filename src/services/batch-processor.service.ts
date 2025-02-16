import EventEmitter from "events";
import messageRepository from "../repositories/message.repository";

export class BatchProcessor extends EventEmitter {
  constructor(private whatsappService: any) {
    super();
  }

  async processBatch(messages: IMessageRecord[]): Promise<void> {
    const totalMessages = messages.length;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const message of messages) {
      try {
        await this.whatsappService.sendSingleMessage(message);
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
      this.emitProgress(
        totalMessages,
        processedCount,
        successCount,
        failedCount
      );
    }

    this.emit("completed", {
      total: totalMessages,
      successful: successCount,
      failed: failedCount,
    });
  }

  private emitProgress(
    total: number,
    processed: number,
    successful: number,
    failed: number
  ): void {
    this.emit("progress", {
      total,
      processed,
      successful,
      failed,
      currentBatch: Math.ceil(processed / 20),
      totalBatches: Math.ceil(total / 20),
    } as IBatchProgress);
  }
}
