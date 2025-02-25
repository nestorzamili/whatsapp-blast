import express from "express";
import { authLimiter } from "../config/rateLimiter";
import * as authController from "../controllers/auth.controller";
import {
  validateRequestBody,
  validateQueryParams,
} from "../middleware/validator.middleware";

const router = express.Router();

router.post(
  "/register",
  validateRequestBody(["name", "email", "password"]),
  authController.register
);

router.post(
  "/login",
  validateRequestBody(["email", "password"]),
  authController.login
);

router.post(
  "/request-email-verification",
  validateRequestBody(["email"]),
  authLimiter,
  authController.requestEmailVerification
);
router.get("/verify-email", authController.verifyEmail);
router.post(
  "/request-password-reset",
  validateRequestBody(["email"]),
  authLimiter,
  authController.requestPasswordReset
);
router.post(
  "/reset-password",
  validateRequestBody(["newPassword"]),
  validateQueryParams(["token"]),
  authController.resetPassword
);
router.post(
  "/refresh-token",
  validateRequestBody(["refreshToken"]),
  authController.refreshToken
);

export default router;
