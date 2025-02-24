import e, { Request, Response, RequestHandler } from "express";
import prisma from "../config/db";
import logger from "../config/logger";
import clientService from "../services/client.service";
import {
  handleResponse,
  handleAuthError,
  handleServerError,
} from "../utils/response.util";

export const connectClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) return handleAuthError(res);

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!existingClient) {
      const clientId = await clientService.connectClient(userId);
      return handleResponse(res, 200, {
        success: true,
        message: "Initializing new connection",
        status: "INITIALIZING",
        clientId,
      });
    }

    switch (existingClient.status) {
      case "INITIALIZING":
        return handleResponse(res, 200, {
          success: true,
          message: "Connection in progress",
          status: existingClient.status,
          clientId: existingClient.id,
        });

      case "CONNECTED":
        return handleResponse(res, 200, {
          success: true,
          message: "Already connected",
          status: existingClient.status,
          clientId: existingClient.id,
        });

      case "DISCONNECTED":
      case "LOGOUT":
        await clientService.connectClient(userId);
        return handleResponse(res, 200, {
          success: true,
          message: "Reconnecting...",
          status: "INITIALIZING",
          clientId: existingClient.id,
        });
    }
  } catch (error: any) {
    logger.error(`Connect error: ${error.message}`);
    handleServerError(res, error);
  }
};

export const disconnectClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) return handleAuthError(res);

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!existingClient) {
      return handleResponse(res, 404, {
        success: false,
        message: "Client not found",
      });
    }

    switch (existingClient.status) {
      case "CONNECTED":
      case "INITIALIZING":
      case "DISCONNECTED":
        await clientService.disconnectClient(userId);
        const updatedClient = await prisma.client.findFirst({
          where: { userId },
          select: { status: true },
        });
        return handleResponse(res, 200, {
          success: true,
          message: "Disconnecting...",
          status: updatedClient?.status,
        });

      case "LOGOUT":
        return handleResponse(res, 200, {
          success: true,
          message: "Already disconnected",
          status: existingClient.status,
        });
    }
  } catch (error: any) {
    logger.error(`Disconnect error: ${error.message}`);
    handleServerError(res, error);
  }
};

export const deleteDevice: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) return handleAuthError(res);

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!existingClient) {
      return handleResponse(res, 404, {
        success: false,
        message: "Client not found",
      });
    }

    switch (existingClient.status) {
      case "CONNECTED":
      case "INITIALIZING":
      case "DISCONNECTED":
        await clientService.deleteDevice(userId);
        return handleResponse(res, 200, {
          success: true,
          message: "Device deleted",
          status: existingClient.status,
        });

      case "LOGOUT":
        return handleResponse(res, 200, {
          success: true,
          message: "Device already deleted",
          status: existingClient.status,
        });
    }
  } catch (error: any) {
    logger.error(`Delete device error: ${error.message}`);
    handleServerError(res, error);
  }
};

export const getClientStatus: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) return handleAuthError(res);

  try {
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { status: true, lastActive: true },
    });

    if (!client) {
      return handleResponse(res, 404, {
        success: false,
        message: "Client not found",
      });
    }

    return handleResponse(res, 200, {
      success: true,
      message: "Client status",
      status: client.status,
      lastActive: client.lastActive,
    });
  } catch (error: any) {
    logger.error(`Get client status error: ${error.message}`);
    handleServerError(res, error);
  }
};

export const getClientQr: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) return handleAuthError(res);

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true, lastQrCode: true },
    });

    if (!existingClient) {
      return handleResponse(res, 404, {
        success: false,
        message: "Client not found",
      });
    }

    switch (existingClient.status) {
      case "INITIALIZING":
        return handleResponse(res, 200, {
          success: true,
          message: "Connection in progress",
          status: existingClient.status,
          qrCode: existingClient.lastQrCode,
        });

      case "CONNECTED":
        return handleResponse(res, 200, {
          success: true,
          message: "Client already connected",
          status: existingClient.status,
        });

      case "DISCONNECTED":
      case "LOGOUT":
        return handleResponse(res, 200, {
          success: true,
          message: "User already logged out or disconnected",
          status: existingClient.status,
        });
    }
  } catch (error: any) {
    logger.error(`Get QR code error: ${error.message}`);
    handleServerError(res, error);
  }
};
