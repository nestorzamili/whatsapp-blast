import { Request, Response } from "express";
import authService from "../services/auth.service";
import logger from "../config/logger";
import { ResponseUtil, HttpStatus } from "../utils/response.util";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    ResponseUtil.validationError(res, ["All fields are required"]);
    return;
  }

  try {
    const user = await authService.register(name, email, password);
    logger.info(`User registered successfully: ${email}`);
    ResponseUtil.created(
      res,
      "User registered successfully. Please check your email to verify your account.",
      { email: user.email }
    );
  } catch (error: any) {
    logger.error(`Registration error for ${email}: ${error.message}`);
    ResponseUtil.error(
      res,
      error.message,
      error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    ResponseUtil.validationError(
      res,
      [
        !email ? "Email is required" : null,
        !password ? "Password is required" : null,
      ].filter(Boolean) as string[],
      "Invalid credentials"
    );
    return;
  }

  try {
    const result = await authService.login(email, password);
    logger.info(`User logged in successfully: ${email}`);
    ResponseUtil.success(res, "Login successful", result);
  } catch (error: any) {
    logger.error(`Login error for ${email}: ${error.message}`);
    ResponseUtil.error(
      res,
      error.message,
      error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    ResponseUtil.validationError(res, ["Refresh token is required"]);
    return;
  }

  try {
    const result = await authService.refreshAccessToken(refreshToken);
    ResponseUtil.success(res, "Token refreshed successfully", result);
  } catch (error: any) {
    logger.error(`Token refresh error: ${error.message}`);
    ResponseUtil.error(
      res,
      error.message,
      error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

export const requestEmailVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    ResponseUtil.validationError(res, ["Email is required"]);
    return;
  }

  try {
    await authService.requestEmailVerification(email);
    ResponseUtil.success(res, `Verification email sent to ${email}`);
  } catch (error: any) {
    logger.error(`Email verification request error: ${error.message}`);
    ResponseUtil.error(
      res,
      error.message,
      error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!token) {
    res.redirect(`${frontendUrl}/auth/login?error=Token is required`);
    return;
  }

  try {
    await authService.verifyEmail(token);
    res.redirect(
      `${frontendUrl}/auth/login?success=Email verified successfully`
    );
  } catch (error: any) {
    logger.error(`Email verification error: ${error.message}`);
    res.redirect(`${frontendUrl}/auth/login?error=${error.message}`);
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    ResponseUtil.validationError(res, ["Email is required"]);
    return;
  }

  try {
    await authService.requestPasswordReset(email);
    ResponseUtil.success(res, "Password reset instructions sent to your email");
  } catch (error: any) {
    logger.error(`Password reset request error: ${error.message}`);
    ResponseUtil.error(
      res,
      error.message,
      error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    ResponseUtil.validationError(
      res,
      [
        !token ? "Reset token is required" : null,
        !newPassword ? "New password is required" : null,
      ].filter(Boolean) as string[],
      "Validation failed"
    );
    return;
  }

  try {
    await authService.resetPassword(token, newPassword);
    ResponseUtil.success(res, "Password reset successful");
  } catch (error: any) {
    logger.error(`Password reset error: ${error.message}`);
    ResponseUtil.error(
      res,
      error.message,
      error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};
