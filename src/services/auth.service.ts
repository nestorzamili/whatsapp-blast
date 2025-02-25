import bcrypt from "bcryptjs";
import prisma from "../config/db";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyRefreshToken,
} from "../config/jwt";
import { sendVerificationEmail, sendPasswordReset } from "./email.service";
import QuotaService from "./quota.service";
import logger from "../config/logger";
import { HttpStatus } from "../utils/response.util";

export class AuthService {
  private createError(message: string, statusCode: HttpStatus): ServiceError {
    return { message, statusCode };
  }

  private async findUserByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw this.createError("User not found", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async register(name: string, email: string, password: string) {
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw this.createError("User already exists", HttpStatus.CONFLICT);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = generateVerificationToken();

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "user",
          verificationToken,
          verifyExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await sendVerificationEmail(email, verificationToken);
      logger.info(`Verification email sent to ${email}`);
      return user;
    } catch (error) {
      logger.error(`Failed to register user: ${error}`);
      throw this.createError("Registration failed", HttpStatus.BAD_REQUEST);
    }
  }

  async login(email: string, password: string) {
    const user = await this.findUserByEmail(email);

    if (!(await bcrypt.compare(password, user.password))) {
      throw this.createError("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    if (!user.isVerified) {
      throw this.createError(
        "Email not verified. Please verify your email first",
        HttpStatus.UNAUTHORIZED
      );
    }

    const userPayload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    return {
      accessToken: generateAccessToken(userPayload),
      refreshToken: generateRefreshToken(userPayload),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const verification = await verifyRefreshToken(refreshToken);

    if (!verification.isValid || !verification.payload) {
      throw this.createError(
        "Invalid or expired refresh token",
        HttpStatus.UNAUTHORIZED
      );
    }

    const { id, role, name, email } = verification.payload;
    return {
      accessToken: generateAccessToken({ id, role, name, email }),
    };
  }

  async requestEmailVerification(email: string) {
    const user = await this.findUserByEmail(email);

    if (user.isVerified) {
      throw this.createError("Email is already verified", HttpStatus.CONFLICT);
    }

    const token = generateVerificationToken();
    await prisma.user.update({
      where: { email },
      data: {
        verificationToken: token,
        verifyExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw this.createError(
        "Invalid or expired token",
        HttpStatus.UNAUTHORIZED
      );
    }

    await QuotaService.createQuota(user.id, 10);
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verifyExpires: null,
      },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.findUserByEmail(email);

    const resetToken = generateVerificationToken();
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordReset(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw this.createError(
        "Invalid or expired token",
        HttpStatus.UNAUTHORIZED
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });
  }
}

export default new AuthService();
