import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import prisma from "../config/db";
import logger from "../config/logger";
import { ResponseUtil } from "../utils/response.util";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.error("Access denied. No token provided.");
    ResponseUtil.unauthorized(res, "Access denied. No token provided.");
    return;
  }

  const verification = await verifyToken(token);
  if (!verification.isValid || !verification.payload) {
    logger.warn("Unauthorized access attempt");
    ResponseUtil.unauthorized(res, verification.error || "Invalid token");
    return;
  }

  req.user = verification.payload;
  next();
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    logger.error("No user data in request");
    ResponseUtil.unauthorized(res, "Authentication required");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!user) {
    logger.error("User not found in database");
    ResponseUtil.unauthorized(res, "Invalid token");
    return;
  }

  if (user.role !== "suhu") {
    logger.error("Access denied. Unauthorized user.");
    ResponseUtil.forbidden(res, "Access denied. Unauthorized user.");
    return;
  }

  next();
};

export const apiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    logger.error("Access denied. No API key provided.");
    ResponseUtil.unauthorized(res, "Access denied. No API key provided.");
    return;
  }

  if (apiKey !== process.env.API_KEY) {
    logger.warn("Unauthorized access attempt");
    ResponseUtil.unauthorized(res, "Invalid API key");
    return;
  }

  next();
};
