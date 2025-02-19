import prisma from "../config/db";
import { cleanPhoneNumber } from "../utils/phone.util";

export class MessageRepository {
  async createMessages(
    clientId: string,
    messagePayload: MessagePayload
  ): Promise<MessageRecord[]> {
    const { numbers, content, media } = messagePayload;

    const result = await prisma.$transaction(
      numbers.map((number) => {
        const cleanedNumber = cleanPhoneNumber(number);
        return prisma.message.create({
          data: {
            clientId,
            number: cleanedNumber,
            content,
            mediaUrl: media || null, // Convert undefined to null
            status: "PENDING",
            createdAt: new Date(),
          },
        });
      })
    );

    return result.map((record) => ({
      id: record.id,
      clientId: record.clientId,
      number: record.number,
      content: record.content,
      mediaUrl: record.mediaUrl,
      status: record.status,
      error: record.error || undefined,
      createdAt: record.createdAt,
    }));
  }

  async updateMessageStatus(
    id: string,
    status: "SENT" | "FAILED",
    error?: string
  ): Promise<void> {
    await prisma.message.update({
      where: { id },
      data: {
        status,
        error,
        createdAt: status === "SENT" ? new Date() : undefined,
      },
    });
  }
}

export default new MessageRepository();
