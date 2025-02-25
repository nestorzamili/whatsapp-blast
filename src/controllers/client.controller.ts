import { Request, Response, RequestHandler, response } from "express";
import prisma from "../config/db";
import logger from "../config/logger";
import clientService from "../services/client.service";
import { ResponseUtil } from "../utils/response.util";

export const connectClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    ResponseUtil.unauthorized(
      res,
      "User not found. Please login and try again."
    );
    return;
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!existingClient) {
      ResponseUtil.success(res, "Connection in progress. Please scan QR code", {
        status: "INITIALIZING",
      });

      clientService.connectClient(userId);
      return;
    }

    switch (existingClient.status) {
      case "INITIALIZING":
        ResponseUtil.success(
          res,
          "Your connection is in progress. Please scan QR code",
          {
            clientId: existingClient.id,
            status: existingClient.status,
          }
        );
        return;

      case "CONNECTED":
        ResponseUtil.success(res, "Client already connected", {
          clientId: existingClient.id,
          status: existingClient.status,
        });
        return;

      case "DISCONNECTED":
      case "LOGOUT":
        ResponseUtil.success(
          res,
          "Connection in progress. Please scan QR code",
          {
            clientId: existingClient.id,
            status: "INITIALIZING",
          }
        );

        clientService.connectClient(userId);
        return;
    }
  } catch (error: any) {
    logger.error(`Connect error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};

export const disconnectClient: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    ResponseUtil.unauthorized(
      res,
      "User not found. Please login and try again."
    );
    return;
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!existingClient) {
      ResponseUtil.notFound(res, "Client not found");
      return;
    }

    switch (existingClient.status) {
      case "CONNECTED":
      case "INITIALIZING":
        await clientService.disconnectClient(userId);
        const updatedClient = await prisma.client.findFirst({
          where: { userId },
          select: { status: true },
        });
        ResponseUtil.success(res, "Client disconnected", {
          clientId: existingClient.id,
          status: updatedClient?.status,
        });
        return;

      case "DISCONNECTED":
        ResponseUtil.success(res, "Client already disconnected", {
          clientId: existingClient.id,
          status: existingClient.status,
        });
        return;

      case "LOGOUT":
        ResponseUtil.success(res, "User already logged out", {
          clientId: existingClient.id,
          status: existingClient.status,
        });
        return;
    }
  } catch (error: any) {
    logger.error(`Disconnect error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};

export const deleteDevice: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    ResponseUtil.unauthorized(
      res,
      "User not found. Please login and try again."
    );
    return;
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!existingClient) {
      ResponseUtil.notFound(res, "Client not found");
      return;
    }

    switch (existingClient.status) {
      case "CONNECTED":
      case "INITIALIZING":
      case "DISCONNECTED":
        await clientService.deleteDevice(userId);
        ResponseUtil.success(res, "Device deleted", {
          clientId: existingClient.id,
          status: "LOGOUT",
        });
        return;

      case "LOGOUT":
        ResponseUtil.success(res, "User already logged out", {
          clientId: existingClient.id,
          status: existingClient.status,
        });
        return;
    }
  } catch (error: any) {
    logger.error(`Delete device error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};

export const getClientStatus: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    ResponseUtil.unauthorized(
      res,
      "User not found. Please login and try again."
    );
    return;
  }

  try {
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true, lastActive: true },
    });

    if (!client) {
      ResponseUtil.notFound(res, "Client not found");
      return;
    }

    ResponseUtil.success(res, "Client status retrieved", {
      clientId: client.id,
      status: client.status,
      lastActive: client.lastActive,
    });
  } catch (error: any) {
    logger.error(`Get client status error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};

export const getClientQr: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    ResponseUtil.unauthorized(
      res,
      "User not found. Please login and try again."
    );
    return;
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, status: true, lastQrCode: true },
    });

    if (!existingClient) {
      ResponseUtil.notFound(res, "Client not found");
      return;
    }

    switch (existingClient.status) {
      case "INITIALIZING":
        ResponseUtil.success(res, "QR code generation in progress", {
          clientId: existingClient.id,
          status: existingClient.status,
        });
        return;

      case "CONNECTED":
        ResponseUtil.success(res, "QR code already generated", {
          clientId: existingClient.id,
          status: existingClient.status,
          qrCode: existingClient.lastQrCode,
        });
        return;

      case "DISCONNECTED":
      case "LOGOUT":
        ResponseUtil.success(res, "User logged out. Please connect again", {
          clientId: existingClient.id,
          status: existingClient.status,
          qrCode: null,
        });
        return;
    }
  } catch (error: any) {
    logger.error(`Get QR code error: ${error.message}`);
    ResponseUtil.internalServerError(res, error);
  }
};
