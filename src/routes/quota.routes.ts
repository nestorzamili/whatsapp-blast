import express from "express";
import { addQuota, checkQuota } from "../controllers/quota.controller";
import {
  authMiddleware,
  isAdmin,
  apiKeyMiddleware,
} from "../middleware/auth.middleware";
import { validateRequestBody } from "../middleware/validator.middleware";

const router = express.Router();

router.use(apiKeyMiddleware);
router.use(authMiddleware);

router.post(
  "/add-quota",
  validateRequestBody(["userId", "amount"]),
  isAdmin,
  addQuota
);
router.get("/check-quota", checkQuota);

export default router;
