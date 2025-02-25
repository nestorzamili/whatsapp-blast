import { Request, Response, RequestHandler } from "express";
import QuotaService from "../services/quota.service";
import logger from "../config/logger";
import { ResponseUtil } from "../utils/response.util";
import prisma from "../config/db";

export const addQuota: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      ResponseUtil.validationError(
        res,
        [
          !userId ? "User ID is required" : null,
          !amount ? "Amount is required" : null,
          amount <= 0 ? "Amount must be greater than 0" : null,
        ].filter(Boolean) as string[],
        "Invalid quota parameters"
      );
      return;
    }

    const user = await prisma.quota.findUnique({
      where: { userId },
    });

    if (!user) {
      ResponseUtil.notFound(res, "User quota record not found");
      return;
    }

    await QuotaService.addQuota(userId, amount);

    ResponseUtil.success(res, "Quota added successfully", {
      userId,
      addedAmount: amount,
    });
  } catch (error: any) {
    logger.error(`Add quota error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};

export const checkQuota: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      ResponseUtil.unauthorized(res, "User authentication required");
      return;
    }

    try {
      const quotaData = await QuotaService.getAvailableBalance(userId);
      ResponseUtil.success(res, "Quota retrieved successfully", {
        userId,
        balance: quotaData.balance,
        lockedAmount: quotaData.lockedAmount,
        availableBalance: quotaData.balance - quotaData.lockedAmount,
      });
    } catch (error: any) {
      if (error.message === "Quota not found") {
        ResponseUtil.notFound(res, "Quota not found for this user");
        return;
      }
      throw error;
    }
  } catch (error: any) {
    logger.error(`Check quota error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};
