import { Request, Response, RequestHandler } from "express";
import QuotaService from "../services/quota.service";
import logger from "../config/logger";
import {
  handleResponse,
  handleAuthError,
  handleServerError,
} from "../utils/response.util";
import prisma from "../config/db";

export const addQuota: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const amount = req.body.amount;

    if (!userId) {
      handleAuthError(res);
      return;
    }

    if (!amount) {
      handleResponse(res, 400, {
        success: false,
        message: "Amount is required",
      });
      return;
    }

    if (amount <= 0) {
      handleResponse(res, 400, {
        success: false,
        message: "Amount must be greater than 0",
      });
      return;
    }

    const user = await prisma.quota.findUnique({
      where: { userId },
    });

    if (!user) {
      await QuotaService.createQuota(userId, amount);
    } else {
      await QuotaService.addQuota(userId, amount);
    }

    handleResponse(res, 200, {
      success: true,
      message: "Quota added successfully",
    });
  } catch (error: any) {
    logger.error(`Add quota error: ${error.message}`);
    handleServerError(res, error);
  }
};

export const checkQuota: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      handleAuthError(res);
      return;
    }

    const { balance, lockedAmount } = await QuotaService.getAvailableBalance(
      userId
    );

    handleResponse(res, 200, {
      success: true,
      message: "Quota retrieved successfully",
      balance,
      lockedAmount,
    });
  } catch (error: any) {
    logger.error(`Check quota error: ${error.message}`);
    handleServerError(res, error);
  }
};
