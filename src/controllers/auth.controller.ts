import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyRefreshToken,
} from "../config/jwt";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service";
import logger from "../config/logger";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    logger.error("All fields are required");
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    logger.error("User already exists");
    res.status(400).json({ message: "User already exists" });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
        verificationToken,
        verifyExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, verificationToken);

    logger.info("User registered successfully");
    res.json({
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.error("Email and password are required");
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.error("Invalid credentials");
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isVerified) {
      logger.error("Email is not verified");
      res.status(400).json({ message: "Email is not verified" });
      return;
    }

    const userPayload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    logger.info("User logged in successfully");
    res.json({ accessToken, refreshToken });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.error("Refresh token is required");
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  try {
    const verification = await verifyRefreshToken(refreshToken);

    if (!verification.isValid || !verification.payload) {
      logger.error(verification.error);
      res.status(401).json({ message: verification.error });
      return;
    }

    const newAccessToken = generateAccessToken(verification.payload);
    logger.info("Access token refreshed successfully");
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const requestEmailVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    logger.error("Email is required");
    res.status(400).json({ message: "Email is required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.error("User not found");
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.isVerified) {
      logger.error("Email is already verified");
      res.status(400).json({ message: "Email is already verified" });
      return;
    }

    const token = generateVerificationToken();
    await prisma.user.update({
      where: { email },
      data: {
        verificationToken: token,
        verifyExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, token);
    logger.info("Verification email sent");
    res.json({ message: "Verification email sent" });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string;

  if (!token) {
    logger.error("Token is required");
    res.status(400).json({ message: "Token is required" });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      logger.error("Invalid or expired token");
      res.status(400).json({ message: "Invalid or expired token" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verifyExpires: null,
      },
    });
    logger.info("Email verified successfully");
    res.json({ message: "Email verified successfully" });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(400).json({ message: "Invalid token" });
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    logger.error("Email is required");
    res.status(400).json({ message: "Email is required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.error("User not found");
      res.status(404).json({ message: "User not found" });
      return;
    }

    const resetToken = generateVerificationToken();
    await prisma.user.update({
      where: { email },
      data: {
        resetToken: resetToken,
        resetTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(email, resetToken);
    logger.info("Password reset email sent");
    res.json({ message: "Password reset email sent" });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    logger.error("Token and new password are required");
    res.status(400).json({ message: "Token and new password are required" });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      logger.error("Invalid or expired token");
      res.status(400).json({ message: "Invalid or expired token" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });
    logger.info("Password reset successfully");
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    logger.error("An unknown error occurred", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
