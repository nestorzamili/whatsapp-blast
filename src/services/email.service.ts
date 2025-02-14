import transporter from "../config/nodemailer";
import { emailVerification } from "../templates/emailVerification";
import logger from "../config/logger";

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const htmlContent = emailVerification({
      title: "Verify Your Email",
      message: "Please click the button below to verify your email address.",
      buttonText: "Verify Email",
      buttonLink: verifyLink,
      message2:
        "If you did not create an account, no further action is required.",
    });

    const info = await transporter.sendMail({
      from: `"WhatsApp Blast" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email Verification",
      html: htmlContent,
    });

    logger.info(
      `Verification email sent to: ${email}, Message ID: ${info.messageId}`
    );
  } catch (error) {
    logger.error(`Error sending verification email to ${email}:`, error);
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const htmlContent = emailVerification({
      title: "Reset Your Password",
      message: "Please click the button below to reset your password.",
      buttonText: "Reset Password",
      buttonLink: resetLink,
      message2:
        "If you didn't request a password reset, you can ignore this email.",
    });

    const info = await transporter.sendMail({
      from: `"WhatsApp Blast" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      html: htmlContent,
    });

    logger.info(
      `Password reset email sent to: ${email}, Message ID: ${info.messageId}`
    );
  } catch (error) {
    logger.error(`Error sending password reset email to ${email}:`, error);
  }
};
