import { Request, Response, RequestHandler } from "express";
import prisma from "../config/db";
import logger from "../config/logger";
import { WhatsAppService } from "../services/whatsapp.service";

const activeClients: Map<string, WhatsAppService> = new Map();

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

    let client = await prisma.client.findFirst({ where: { userId } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          userId,
          status: "INITIALIZING",
          lastActive: new Date(),
        },
      });
    }

    if (activeClients.has(client.id)) {
      const instance = activeClients.get(client.id);
      const state = await instance?.getState();

      if (state === "CONNECTED") {
        res.status(400).json({
          success: false,
          message: "WhatsApp client already connected",
        });
        return;
      }

      instance?.removeAllListeners();
      instance?.handleLogout();
      activeClients.delete(client.id);
    }

    const whatsappInstance = new WhatsAppService(userId, client.id);
    activeClients.set(client.id, whatsappInstance);
    await whatsappInstance.initialize();

    res.status(200).json({
      success: true,
      message: "WhatsApp client initialization started",
      clientId: client.id,
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

    const existingClient = await prisma.client.findFirst({
      where: { userId },
    });

    if (!existingClient) {
      res.status(404).json({
        success: false,
        message: "Client not found",
      });
      return;
    }

    const whatsappInstance = activeClients.get(existingClient.id);
    if (whatsappInstance) {
      whatsappInstance.handleLogout();
      activeClients.delete(existingClient.id);
    }

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
