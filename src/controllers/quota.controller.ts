import { Request, Response, RequestHandler } from "express";
import QuotaService from "../services/quota.service";
import logger from "../config/logger";

export const addQuota: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const amount = req.body.amount;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!amount) {
      res.status(400).json({ success: false, message: "Amount is required" });
      return;
    }

    if (amount <= 0) {
      res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
      return;
    }

    await QuotaService.addQuota(userId, amount);

    res.status(200).json({
      success: true,
      message: "Quota added successfully",
    });
  } catch (error: any) {
    logger.error(`Add quota error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to add quota",
      error: error.message,
    });
  }
};

export const checkQuota: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const balance = await QuotaService.getAvailableBalance(userId);

    res.status(200).json({
      success: true,
      balance,
    });
  } catch (error: any) {
    logger.error(`Check quota error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to check quota balance",
      error: error.message,
    });
  }
};
