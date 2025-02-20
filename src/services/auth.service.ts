import bcrypt from "bcryptjs";
import prisma from "../config/db";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyRefreshToken,
} from "../config/jwt";
import { sendVerificationEmail, sendPasswordReset } from "./email.service";

export class AuthService {
  async register(name: string, email: string, password: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new Error("User already exists");
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
    return user;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid credentials");
    }

    if (!user.isVerified) {
      throw new Error("Email is not verified");
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
      throw new Error(verification.error || "Invalid refresh token");
    }

    const { id, role, name, email } = verification.payload;
    return {
      accessToken: generateAccessToken({ id, role, name, email }),
    };
  }

  async requestEmailVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isVerified) {
      throw new Error("Email is already verified");
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
      throw new Error("Invalid or expired token");
    }

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
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("User not found");
    }

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
      throw new Error("Invalid or expired token");
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
