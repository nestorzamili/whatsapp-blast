import express from "express";
import {
  connectClient,
  disconnectClient,
  deleteDevice,
  getClientStatus,
  getClientQr,
} from "../controllers/client.controller";
import {
  authMiddleware,
  apiKeyMiddleware,
} from "../middleware/auth.middleware";

const router = express.Router();

router.use(apiKeyMiddleware);
router.use(authMiddleware);

router.post("/connect", connectClient);
router.post("/disconnect", disconnectClient);
router.post("/delete-device", deleteDevice);
router.get("/", getClientStatus);
router.get("/qr", getClientQr);

export default router;
