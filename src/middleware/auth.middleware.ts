import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import prisma from "../config/db";
import logger from "../config/logger";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.error("Access denied. No token provided.");
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  const verification = await verifyToken(token);
  if (!verification.isValid || !verification.payload) {
    logger.warn("Unauthorized access attempt");
    res.status(401).json({ message: verification.error || "Invalid token" });
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
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!user) {
    logger.error("User not found in database");
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  if (user.role !== "suhu") {
    logger.error("Access denied. Unauthorized user.");
    res.status(403).json({ message: "Access denied. Unauthorized user." });
    return;
  }

  next();
};
