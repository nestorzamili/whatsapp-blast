import { Router } from "express";
import { MidtransController } from "../controllers/midtrans.controller";
import {
  authMiddleware,
  apiKeyMiddleware,
} from "../middleware/auth.middleware";

const router = Router();
const midtransController = new MidtransController();

router.post("/notification", midtransController.handleNotification);

// Rute-rute yang membutuhkan autentikasi
router.use(apiKeyMiddleware);
router.use(authMiddleware);

// Rute untuk membuat transaksi
router.post("/transaction", midtransController.createTransaction);

router.get(
  "/transaction/:orderId/status",
  midtransController.getTransactionStatus
);

// Rute untuk mendapatkan informasi harga kuota
router.get("/pricing", midtransController.getQuotaPricing);

// Rute untuk mendapatkan detail transaksi lengkap (memerlukan autentikasi)
router.get(
  "/transaction/:orderId/detail",
  midtransController.getDetailedTransaction
);

// Rute untuk mendapatkan semua transaksi pengguna
router.get(
  "/user/:userId/transactions",
  midtransController.getUserTransactions
);

export default router;
