import { Request, Response, RequestHandler } from "express";
import prisma from "../config/db";
import logger from "../config/logger";
import clientService from "../services/client.service";

export const initializeClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const clientId = await clientService.initializeClient(userId);

    res.status(200).json({
      success: true,
      message: "WhatsApp client initialization started",
      clientId,
    });
  } catch (error: any) {
    logger.error(`Initialize client error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to initialize WhatsApp client",
      error: error.message,
    });
  }
};

export const logoutClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await clientService.logoutClient(userId);

    res.status(200).json({
      success: true,
      message: "WhatsApp client logout initiated",
    });
  } catch (error: any) {
    logger.error(`Logout client error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to logout WhatsApp client",
      error: error.message,
    });
  }
};

export const getClientStatus: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const client = await prisma.client.findFirst({
      where: { userId },
      select: {
        id: true,
        status: true,
        lastActive: true,
        lastQrCode: true,
      },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Client not found",
      });
      return;
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    logger.error(`Get client status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get client status",
      error: error.message,
    });
  }
};
