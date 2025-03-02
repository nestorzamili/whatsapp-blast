import { quotaPrice } from "../config/midtrans";
import { TransactionStatus } from "../types/midtrans.types";

/**
 * Helper functions for Midtrans integration
 */
export const MidtransHelper = {
  /**
   * Calculate total price from quota amount
   */
  calculatePrice: (quotaAmount: number): number => {
    return quotaAmount * quotaPrice;
  },

  /**
   * Generate a human-readable status message
   */
  getStatusMessage: (status: TransactionStatus | string): string => {
    switch (status) {
      case TransactionStatus.PENDING:
        return "Menunggu pembayaran";
      case TransactionStatus.SUCCESS:
        return "Pembayaran berhasil";
      case TransactionStatus.FAILED:
        return "Pembayaran gagal";
      case TransactionStatus.EXPIRED:
        return "Pembayaran kedaluwarsa";
      case TransactionStatus.CANCELED:
        return "Pembayaran dibatalkan";
      default:
        return `Status: ${status}`;
    }
  },

  /**
   * Format currency in IDR
   */
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  },

  /**
   * Get payment method name from Midtrans payment type
   */
  getPaymentMethodName: (paymentType: string): string => {
    const paymentMethods: Record<string, string> = {
      bank_transfer: "Transfer Bank",
      gopay: "GoPay",
      shopeepay: "ShopeePay",
      bca_va: "BCA Virtual Account",
      bni_va: "BNI Virtual Account",
      bri_va: "BRI Virtual Account",
      permata_va: "Permata Virtual Account",
      other_va: "Virtual Account",
      indomaret: "Indomaret",
      qris: "QRIS",
      cimb_clicks: "CIMB Clicks",
      danamon_online: "Danamon Online",
      cstore: "Convenience Store",
    };

    return paymentMethods[paymentType] || paymentType;
  },

  /**
   * Extract readable payment details from transaction
   */
  extractPaymentInfo: (transaction: any): any => {
    const result: any = {
      method: MidtransHelper.getPaymentMethodName(
        transaction.paymentType || ""
      ),
      status: MidtransHelper.getStatusMessage(transaction.status),
      amount: MidtransHelper.formatCurrency(transaction.amount),
    };

    // Extract payment-specific details if available
    if (transaction.paymentDetails) {
      const details = transaction.paymentDetails;

      // Handle virtual account
      if (details.vaNumber) {
        result.vaNumber = details.vaNumber;
        result.bankName = details.bank?.toUpperCase() || "BANK";
      }

      // Handle e-wallet
      if (details.transactionType) {
        result.transactionType = details.transactionType;
      }
    }

    return result;
  },
};
