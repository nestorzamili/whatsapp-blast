import axios, { AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import {
  midtransConfig,
  midtransEndpoints,
  enabledPaymentMethods,
  paymentExpiryConfig,
  quotaPrice,
} from "../config/midtrans";
import {
  TransactionPayload,
  TransactionResponse,
  MidtransNotification,
  MidtransTransactionStatus,
  MidtransErrorResponse,
  TransactionStatus,
} from "../types/midtrans.types";
import { midtransLogger } from "../utils/midtrans-logger";
import prisma from "../config/db";

export class MidtransService {
  private baseUrl: string;
  private authString: string;
  private isProduction: boolean;

  constructor() {
    // Ensure isProduction is a proper boolean
    this.isProduction = midtransConfig.isProduction === true;

    this.baseUrl = this.isProduction
      ? midtransEndpoints.production
      : midtransEndpoints.sandbox;

    this.authString = Buffer.from(`${midtransConfig.serverKey}:`).toString(
      "base64"
    );

    midtransLogger.init(this.isProduction ? "production" : "sandbox");
  }

  /**
   * Create a new transaction for quota purchase
   */
  async createQuotaPurchaseTransaction(userId: string, quotaAmount: number) {
    midtransLogger.createTransaction.start(userId, quotaAmount);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { quota: true },
      });

      if (!user) {
        midtransLogger.createTransaction.userNotFound(userId);
        throw new Error("User tidak ditemukan");
      }

      if (!user.quota) {
        midtransLogger.createTransaction.quotaNotFound(userId);
        throw new Error("User quota tidak ditemukan");
      }

      const amount = quotaAmount * quotaPrice;
      const timestamp = new Date().getTime();
      const orderId = `${timestamp}-${uuidv4().slice(0, 8)}`;

      // Create payload for Midtrans
      const payload: TransactionPayload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        item_details: [
          {
            id: orderId,
            price: quotaPrice,
            quantity: quotaAmount,
            name: "Kuota WhatsApp Blast",
          },
        ],
        customer_details: {
          first_name: user.name,
          email: user.email,
        },
        enabled_payments: enabledPaymentMethods,
        expiry: paymentExpiryConfig,
        callbacks: {
          finish: `${process.env.FRONTEND_URL}/dashboard`,
        },
      };

      // Create transaction in database
      const transaction = await prisma.transaction.create({
        data: {
          orderId,
          amount,
          quotaAmount,
          status: TransactionStatus.PENDING,
          quotaId: user.quota.id,
          expiredAt: new Date(
            Date.now() + paymentExpiryConfig.duration * 60 * 1000 // Convert minutes to milliseconds
          ),
        },
      });

      midtransLogger.createTransaction.created(orderId, transaction.id, amount);

      // Send request to Midtrans
      const midtransResponse = await this.createTransaction(payload);
      midtransLogger.createTransaction.tokenReceived(orderId);

      // Update transaction with Midtrans token
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          snapToken: midtransResponse.token,
          snapRedirectUrl: midtransResponse.redirect_url,
        },
      });

      return {
        transaction: updatedTransaction,
        redirectUrl: midtransResponse.redirect_url,
        priceDetails: {
          quotaAmount,
          pricePerQuota: quotaPrice,
          totalAmount: amount,
        },
      };
    } catch (error) {
      midtransLogger.createTransaction.error(error);
      throw error;
    }
  }

  /**
   * Process notification from Midtrans
   */
  async processNotification(
    notification: MidtransNotification
  ): Promise<MidtransTransactionStatus> {
    const orderId = notification.order_id;
    const status = notification.transaction_status;

    midtransLogger.notification.received(orderId, status);
    midtransLogger.notification.debug(notification);

    try {
      // Verify signature if present
      if (notification.signature_key) {
        if (!this.verifySignature(notification)) {
          midtransLogger.notification.invalidSignature(orderId);
          throw new Error("Invalid signature");
        }
      }

      const transaction = await prisma.transaction.findUnique({
        where: { orderId },
        include: { quota: true },
      });

      if (!transaction) {
        midtransLogger.notification.transactionNotFound(orderId);
        throw new Error("Transaksi tidak ditemukan");
      }

      // Determine transaction status based on Midtrans notification
      let newStatus: TransactionStatus | undefined;

      switch (status) {
        case "capture":
        case "settlement":
          newStatus = TransactionStatus.SUCCESS;
          midtransLogger.notification.statusChange(
            transaction.id,
            transaction.status,
            newStatus
          );

          // Add quota to user if not already successful
          if (transaction.status !== TransactionStatus.SUCCESS) {
            await prisma.quota.update({
              where: { id: transaction.quota.id },
              data: {
                balance: transaction.quota.balance + transaction.quotaAmount,
              },
            });
            midtransLogger.notification.quotaAdded(
              transaction.id,
              transaction.quotaAmount
            );
          } else {
            midtransLogger.notification.alreadyProcessed(transaction.id);
          }
          break;

        case "deny":
        case "cancel":
        case "failure":
          newStatus = TransactionStatus.FAILED;
          midtransLogger.notification.statusChange(
            transaction.id,
            transaction.status,
            newStatus
          );
          break;

        case "expire":
          newStatus = TransactionStatus.EXPIRED;
          midtransLogger.notification.statusChange(
            transaction.id,
            transaction.status,
            newStatus
          );
          break;

        case "pending":
          // Keep status as PENDING, no need to update
          break;
      }

      // Extract payment-specific details for optimized storage
      const paymentDetails: Record<string, any> = {};

      // Handle VA payments
      if (
        notification.payment_type === "bank_transfer" &&
        notification.va_numbers &&
        notification.va_numbers.length > 0
      ) {
        const vaInfo = notification.va_numbers[0];
        paymentDetails.vaNumber = vaInfo.va_number;
        paymentDetails.bank = vaInfo.bank;
      }

      // Handle e-wallet / QRIS specific fields
      if (notification.transaction_type) {
        paymentDetails.transactionType = notification.transaction_type;
      }

      if (notification.acquirer) {
        paymentDetails.acquirer = notification.acquirer;
      }

      if (notification.issuer) {
        paymentDetails.issuer = notification.issuer;
      }

      // Prepare update data
      const updateData: any = {
        paymentType: notification.payment_type,
        midtransId: notification.transaction_id,
        midtransStatus: notification.transaction_status,
        paymentDetails:
          Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
        statusCode: notification.status_code,
        fraudStatus: notification.fraud_status,
        rawNotification: notification,
      };

      // Add timestamps if present
      if (notification.transaction_time) {
        updateData.paymentTime = new Date(notification.transaction_time);
      }

      if (notification.settlement_time) {
        updateData.settlementTime = new Date(notification.settlement_time);
      }

      if (notification.expiry_time) {
        updateData.expiryTime = new Date(notification.expiry_time);
      }

      // Update status if changed
      if (newStatus && transaction.status !== newStatus) {
        updateData.status = newStatus;

        if (newStatus === TransactionStatus.SUCCESS) {
          updateData.paidAt = new Date();
        }
      }

      // Update transaction with notification data
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: updateData,
      });

      midtransLogger.notification.updated(transaction.id);

      return {
        orderId: notification.order_id,
        transactionStatus: notification.transaction_status,
        paymentType: notification.payment_type,
      };
    } catch (error) {
      midtransLogger.notification.error(error, orderId);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(orderId: string) {
    midtransLogger.status.request(orderId);

    try {
      const transaction = await prisma.transaction.findUnique({
        where: { orderId },
      });

      if (!transaction) {
        midtransLogger.status.notFound(orderId);
        throw new Error("Transaksi tidak ditemukan");
      }

      midtransLogger.status.retrieved(orderId, transaction.status);
      return transaction;
    } catch (error) {
      midtransLogger.status.error(orderId, error);
      throw error;
    }
  }

  /**
   * Get all transactions for a user
   */
  async getUserTransactions(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { quota: true },
      });

      if (!user || !user.quota) {
        throw new Error("User atau quota tidak ditemukan");
      }

      const transactions = await prisma.transaction.findMany({
        where: { quotaId: user.quota.id },
        orderBy: { createdAt: "desc" },
      });

      return transactions;
    } catch (error) {
      midtransLogger.error(`Error getting user transactions: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Create transaction in Midtrans
   */
  private async createTransaction(
    payload: TransactionPayload
  ): Promise<TransactionResponse> {
    const orderId = payload.transaction_details.order_id;
    midtransLogger.api.request("transaction create", orderId);

    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${this.authString}`,
        },
      });

      midtransLogger.api.success("transaction create", orderId);
      return {
        token: response.data.token,
        redirect_url: response.data.redirect_url,
      };
    } catch (error) {
      // Handle specific Midtrans error responses
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const status = axiosError.response.status;
          const data = axiosError.response.data as MidtransErrorResponse;
          const errorMessages =
            data.error_messages?.join(", ") || "Unknown Midtrans error";

          midtransLogger.api.error(
            "transaction create",
            orderId,
            `Status: ${status}, Message: ${errorMessages}`
          );

          // Handle specific error cases
          switch (status) {
            case 401:
              throw new Error(`Authentication failed: ${errorMessages}`);

            case 400:
              // Check for common validation errors
              if (
                errorMessages.includes("order_id has been paid and utilized")
              ) {
                throw new Error("Order ID sudah digunakan, silakan coba lagi");
              } else {
                throw new Error(`Validasi gagal: ${errorMessages}`);
              }

            case 500:
              throw new Error(
                "Terjadi kesalahan pada layanan Midtrans, silakan coba lagi nanti"
              );

            default:
              throw new Error(`Midtrans error: ${errorMessages}`);
          }
        }
      }

      midtransLogger.api.error("transaction create", orderId, error);
      throw new Error(
        "Gagal menghubungi layanan pembayaran, silakan coba lagi"
      );
    }
  }

  /**
   * Verify signature from Midtrans notification
   */
  private verifySignature(notification: MidtransNotification): boolean {
    try {
      const data =
        notification.order_id +
        notification.status_code +
        notification.gross_amount +
        midtransConfig.serverKey;

      const expectedSignature = crypto
        .createHash("sha512")
        .update(data)
        .digest("hex");

      return expectedSignature === notification.signature_key;
    } catch (error) {
      midtransLogger.error("Error verifying signature", error);
      return false;
    }
  }
}
