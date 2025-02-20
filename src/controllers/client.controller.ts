import { Request, Response, RequestHandler } from "express";
import prisma from "../config/db";
import logger from "../config/logger";
import clientService from "../services/client.service";

export const connectClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const clientId = await clientService.connectClient(userId);

    res.status(200).json({
      success: true,
      message: "WhatsApp client connection initiated",
      clientId,
    });
  } catch (error: any) {
    logger.error(`Connect client error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to connect WhatsApp client",
      error: error.message,
    });
  }
};

export const disconnectClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await clientService.disconnectClient(userId);

    res.status(200).json({
      success: true,
      message: "WhatsApp client disconnected",
    });
  } catch (error: any) {
    logger.error(`Disconnect client error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect WhatsApp client",
      error: error.message,
    });
  }
};

export const deleteDevice: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await clientService.deleteDevice(userId);

    res.status(200).json({
      success: true,
      message: "WhatsApp client deleted",
    });
  } catch (error: any) {
    logger.error(`Delete device error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to delete WhatsApp client",
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

export const getClientQr: RequestHandler = async (
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
        lastQrCode: true,
      },
    });

    if (!client || !client.lastQrCode) {
      res.status(404).json({
        success: false,
        message: "QR code not found",
      });
      return;
    }

    res.json({
      success: true,
      data: { qr: client.lastQrCode },
    });
  } catch (error: any) {
    logger.error(`Get client QR error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get client QR code",
      error: error.message,
    });
  }
};
