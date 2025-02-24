import prisma from "../config/db";
import logger from "../config/logger";
import { Prisma } from "@prisma/client";

class QuotaService {
  async getAvailableBalance(
    userId: string
  ): Promise<{ balance: number; lockedAmount: number }> {
    const quota = await prisma.quota.findUnique({
      where: { userId },
      select: { balance: true, lockedAmount: true },
    });

    if (!quota) {
      throw new Error("Quota not found");
    }

    return { balance: quota.balance, lockedAmount: quota.lockedAmount };
  }

  async addQuota(userId: string, amount: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const quota = await tx.quota.findUnique({
        where: { userId },
      });

      if (!quota) {
        throw new Error("Quota not found");
      }

      await tx.quota.update({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
      });
    });
  }

  async createQuota(userId: string, initialBalance: number = 0): Promise<void> {
    try {
      await prisma.quota.create({
        data: {
          userId,
          balance: initialBalance,
          lockedAmount: 0,
        },
      });
      logger.info(`Created quota for user: ${userId}`);
    } catch (error: any) {
      logger.error(`Create quota error: ${error.message}`);
      throw error;
    }
  }

  async reserveQuota(userId: string, amount: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const quota = await tx.quota.findUnique({
        where: { userId },
        select: { balance: true, lockedAmount: true },
      });

      if (!quota) {
        throw new Error("Quota not found");
      }

      if (quota.balance < amount) {
        const error = new Error(
          `Insufficient balance. Required: ${amount}, Available: ${quota.balance}`
        );
        (
          error as any
        ).userMessage = `Insufficient balance. You need ${amount} credits but only have ${quota.balance} available.`;
        throw error;
      }

      await tx.quota.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          lockedAmount: { increment: amount },
        },
      });
    });
  }

  async finalizeQuotaUsage(
    userId: string,
    successCount: number
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const quota = await tx.quota.findUnique({
          where: { userId },
          select: { balance: true, lockedAmount: true },
        });

        if (!quota) {
          throw new Error("Quota not found");
        }

        const unusedAmount = quota.lockedAmount - successCount;

        await tx.quota.update({
          where: { userId },
          data: {
            balance: { increment: unusedAmount },
            lockedAmount: { decrement: quota.lockedAmount },
          },
        });

        logger.info(
          `Finalized quota - Success: ${successCount}, Returned: ${unusedAmount}, UserId: ${userId}`
        );
      });
    } catch (error: any) {
      logger.error(`Finalize quota error: ${error.message}`);
      throw error;
    }
  }
}

export default new QuotaService();
