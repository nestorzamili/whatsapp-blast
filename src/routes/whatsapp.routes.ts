import express from "express";
import {
  getClientStatus,
  initializeClient,
  logoutClient,
} from "../controllers/client.controller";
import {
  getMessageStatus,
  getMessages,
  sendBatchMessages,
} from "../controllers/message.controller";
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
