import express from "express";
import { addQuota, checkQuota } from "../controllers/quota.controller";
import {
  authMiddleware,
  isAdmin,
  apiKeyMiddleware,
} from "../middleware/auth.middleware";

const router = express.Router();

router.use(apiKeyMiddleware);
router.use(authMiddleware);

router.post("/add-quota", isAdmin, addQuota);
router.get("/check-quota", checkQuota);

export default router;
