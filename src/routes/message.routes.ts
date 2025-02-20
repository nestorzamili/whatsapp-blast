import express from "express";
import { getMessages, sendMessages } from "../controllers/message.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/send-messages", sendMessages);
router.get("/", getMessages);

export default router;
