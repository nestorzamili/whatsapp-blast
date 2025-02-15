import express from "express";
import { authLimiter } from "../config/rateLimiter";
import {
  register,
  login,
  refreshToken,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post(
  "/request-email-verification",
  authLimiter,
  requestEmailVerification
);
router.post("/verify-email", verifyEmail);
router.post("/request-password-reset", authLimiter, requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
