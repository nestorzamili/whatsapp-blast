import express from "express";
import { addQuota, checkQuota } from "../controllers/quota.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/add-quota", isAdmin, addQuota);
router.get("/check-quota", checkQuota);

export default router;
