import { Request, Response } from "express";
import { MidtransService } from "../services/midtrans.service";
import { MidtransNotification } from "../types/midtrans.types";
import { ResponseUtil } from "../utils/response.util";
import { quotaPrice } from "../config/midtrans";
import { midtransLogger } from "../utils/midtrans-logger";
import prisma from "../config/db";

const midtransService = new MidtransService();

export class MidtransController {
  /**
   * Create a transaction for quota purchase
   */
  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { quotaAmount } = req.body;

      if (!userId || !quotaAmount) {
        midtransLogger.error("Invalid transaction request", {
          userId,
          quotaAmount,
        });
        ResponseUtil.badRequest(res, "userId dan quotaAmount wajib diisi");
        return;
      }

      // Validate quota amount (must be positive)
      const numQuotaAmount = Number(quotaAmount);
      if (isNaN(numQuotaAmount) || numQuotaAmount <= 0) {
        midtransLogger.error("Invalid quota amount", { quotaAmount });
        ResponseUtil.badRequest(res, "quotaAmount harus berupa angka positif");
        return;
      }

      const result = await midtransService.createQuotaPurchaseTransaction(
        userId,
        numQuotaAmount
      );

      ResponseUtil.created(res, "Transaksi berhasil dibuat", result);
    } catch (error: any) {
      ResponseUtil.internalServerError(
        res,
        error.message || "Gagal membuat transaksi"
      );
    }
  }

  /**
   * Handle notification from Midtrans
   */
  async handleNotification(req: Request, res: Response): Promise<void> {
    try {
      const notification = req.body as MidtransNotification;

      // Validate notification data
      if (!notification.order_id || !notification.transaction_status) {
        ResponseUtil.badRequest(res, "Format notifikasi tidak valid");
        return;
      }

      const result = await midtransService.processNotification(notification);
      ResponseUtil.success(res, "Notifikasi berhasil diproses", result);
    } catch (error: any) {
      // Important: always return 200 OK to Midtrans even on error
      // This prevents Midtrans from retrying the notification unnecessarily
      ResponseUtil.success(res, "Notification received with error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const transaction = await midtransService.getTransactionStatus(orderId);
      ResponseUtil.success(
        res,
        "Status transaksi berhasil diambil",
        transaction
      );
    } catch (error: any) {
      ResponseUtil.internalServerError(
        res,
        error.message || "Gagal mendapatkan status transaksi"
      );
    }
  }

  /**
   * Get detailed transaction info
   */
  async getDetailedTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { orderId },
        include: {
          quota: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!transaction) {
        ResponseUtil.notFound(res, "Transaksi tidak ditemukan");
        return;
      }

      // Remove raw data from response (to keep it clean)
      const sanitizedTransaction = {
        ...transaction,
        rawNotification: undefined,
      };

      ResponseUtil.success(
        res,
        "Detail transaksi berhasil diambil",
        sanitizedTransaction
      );
    } catch (error: any) {
      ResponseUtil.internalServerError(
        res,
        error.message || "Gagal mendapatkan detail transaksi"
      );
    }
  }

  /**
   * Get all transactions for a user
   */
  async getUserTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const transactions = await midtransService.getUserTransactions(userId);
      ResponseUtil.success(
        res,
        "Daftar transaksi berhasil diambil",
        transactions
      );
    } catch (error: any) {
      ResponseUtil.internalServerError(
        res,
        error.message || "Gagal mendapatkan transaksi pengguna"
      );
    }
  }

  /**
   * Get quota pricing information
   */
  async getQuotaPricing(req: Request, res: Response): Promise<void> {
    try {
      const { amount } = req.query;
      const quotaAmount = amount ? Number(amount) : 1;

      if (isNaN(quotaAmount) || quotaAmount <= 0) {
        ResponseUtil.badRequest(res, "Jumlah kuota harus berupa angka positif");
        return;
      }

      const totalPrice = quotaPrice * quotaAmount;

      ResponseUtil.success(res, "Informasi harga kuota", {
        quotaAmount,
        pricePerQuota: quotaPrice,
        totalPrice,
        currency: "IDR",
      });
    } catch (error: any) {
      ResponseUtil.internalServerError(
        res,
        error.message || "Gagal mendapatkan informasi harga"
      );
    }
  }
}
