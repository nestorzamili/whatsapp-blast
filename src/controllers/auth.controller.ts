import { Request, Response } from "express";
import authService from "../services/auth.service";
import logger from "../config/logger";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    logger.error("All fields are required");
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    await authService.register(name, email, password);
    logger.info("User registered successfully");
    res.json({
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error: any) {
    logger.error(error.message);
    res.status(400).json({ message: error.message });
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
    const tokens = await authService.login(email, password);
    logger.info("User logged in successfully");
    res.json(tokens);
  } catch (error: any) {
    logger.error(error.message);
    res.status(401).json({ message: error.message });
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
    const result = await authService.refreshAccessToken(refreshToken);
    logger.info("Access token refreshed successfully");
    res.json(result);
  } catch (error: any) {
    logger.error(error.message);
    res.status(401).json({ message: error.message });
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
    await authService.requestEmailVerification(email);
    res.json({ message: "Verification email sent" });
  } catch (error: any) {
    logger.error(error.message);
    res.status(400).json({ message: error.message });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string;

  if (!token) {
    logger.error("Token is required");
    res.redirect(`${process.env.FRONTEND_URL}/auth/login`);
    return;
  }

  try {
    await authService.verifyEmail(token);
    logger.info("Email verified successfully");
    res.redirect(`${process.env.FRONTEND_URL}/auth/login`);
  } catch (error) {
    logger.error("Invalid or expired token");
    res.redirect(`${process.env.FRONTEND_URL}/auth/login`);
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
    await authService.requestPasswordReset(email);
    res.json({ message: "Password reset mail sent" });
  } catch (error: any) {
    logger.error(error.message);
    res.status(400).json({ message: error.message });
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
    await authService.resetPassword(token, newPassword);
    logger.info("Password reset successfully");
    res.json({ message: "Password reset successfully" });
  } catch (error: any) {
    logger.error(error.message);
    res.status(400).json({ message: error.message });
  }
};
