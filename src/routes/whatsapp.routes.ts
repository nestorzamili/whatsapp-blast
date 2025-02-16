import express from "express";
import {
  initializeClient,
  sendBatchMessages,
  logoutClient,
  getClientStatus,
  getMessages,
  getMessageStatus,
} from "../controllers/whatsapp.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authMiddleware);

router
  .route("/client")
  .post(initializeClient)
  .get(getClientStatus)
  .delete(logoutClient);

router.route("/messages").post(sendBatchMessages).get(getMessages);

router.get("/messages/:id", getMessageStatus);

export default router;
