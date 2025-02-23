import express from "express";
import { getMessages, sendMessages } from "../controllers/message.controller";
import {
  authMiddleware,
  apiKeyMiddleware,
} from "../middleware/auth.middleware";

const router = express.Router();

router.use(apiKeyMiddleware);
router.use(authMiddleware);

router.post("/send-messages", sendMessages);
router.get("/", getMessages);

export default router;
