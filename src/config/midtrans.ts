import { isProduction as checkIsProduction } from "../utils/environment";

// Midtrans endpoints
export const midtransEndpoints = {
  sandbox: "https://app.sandbox.midtrans.com/snap/v1/transactions",
  production: "https://app.midtrans.com/snap/v1/transactions",
};

// Midtrans API configuration
export const midtransConfig = {
  // Pastikan ini adalah nilai boolean yang benar
  isProduction: checkIsProduction(),
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
};

// Midtrans enabled payment method
export const enabledPaymentMethods = [
  "cimb_clicks",
  "bca_klikbca",
  "bca_klikpay",
  "bri_epay",
  "echannel",
  "permata_va",
  "bca_va",
  "bni_va",
  "bri_va",
  "cimb_va",
  "other_va",
  "gopay",
  "indomaret",
  "danamon_online",
  "akulaku",
  "shopeepay",
  "kredivo",
  "uob_ezpay",
  "other_qris",
];

// Konfigurasi expiry untuk pembayaran
export const paymentExpiryConfig = {
  unit: "minutes",
  duration: 15,
};

// Konfigurasi harga kuota (dalam Rupiah)
export const quotaPrice = 200; // 200 rupiah per kuota
