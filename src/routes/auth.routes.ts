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

router.post("/login", login);
router.post("/register", register);
router.post(
  "/request-email-verification",
  authLimiter,
  requestEmailVerification
);
router.get("/verify-email", verifyEmail);
router.post("/request-password-reset", authLimiter, requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);

export default router;
