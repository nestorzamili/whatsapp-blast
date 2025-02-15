import express from "express";
import {
  initializeClient,
  sendBatchMessages,
  logoutClient,
} from "../controllers/whatsapp.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authMiddleware);
router.post("/initialize", initializeClient);
router.post("/send", sendBatchMessages);
router.post("/logout", logoutClient);

export default router;
