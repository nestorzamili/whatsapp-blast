import prisma from "../config/db";
import { cleanPhoneNumber } from "../utils/phone.util";

export class MessageRepository {
  async createMessages(
    clientId: string,
    messages: IMessagePayload | IMessagePayload[]
  ): Promise<IMessageRecord[]> {
    const messageArray = Array.isArray(messages) ? messages : [messages];

    const result = await prisma.$transaction(
      messageArray.map((msg) => {
        const cleanedNumber = cleanPhoneNumber(msg.number);
        return prisma.message.create({
          data: {
            clientId,
            number: cleanedNumber,
            content: msg.content,
            status: "PENDING",
            createdAt: new Date(),
          },
        });
      })
    );

    return result.map((record) => ({
      ...record,
      error: record.error ?? undefined,
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
