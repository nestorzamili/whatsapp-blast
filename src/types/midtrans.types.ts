export interface TransactionDetails {
  order_id: string;
  gross_amount: number;
}

export interface ItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CustomerDetails {
  first_name: string;
  email: string;
  phone?: string;
}

export interface TransactionPayload {
  transaction_details: TransactionDetails;
  item_details?: ItemDetail[];
  customer_details: CustomerDetails;
  enabled_payments: string[];
  expiry?: {
    unit: string;
    duration: number;
  };
  callbacks?: {
    finish?: string;
  };
}

export interface TransactionResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;

  // Additional fields based on payment method
  settlement_time?: string;
  transaction_type?: string;
  expiry_time?: string;
  acquirer?: string;
  issuer?: string;

  // Virtual Account specific fields
  va_numbers?: Array<{
    va_number: string;
    bank: string;
  }>;

  // QRIS specific fields
  qr_string?: string;
  callback_url?: string;

  // Credit Card specific fields
  card_type?: string;
  masked_card?: string;

  // Store specific fields
  store?: string;
  payment_code?: string;

  // Other possible fields
  approval_code?: string;
  eci?: string;
  saved_token_id?: string;
  saved_token_id_expired_at?: string;
  point_balance?: number;
  point_balance_amount?: string;
  point_redeem_amount?: number;
  bank?: string;
  biller_code?: string;
  bill_key?: string;
  permata_va_number?: string;
  payment_amounts?: any[];

  // Any other fields that might be sent
  [key: string]: any;
}

export interface MidtransTransactionStatus {
  orderId: string;
  transactionStatus: string;
  paymentType: string;
}

export interface MidtransErrorResponse {
  error_messages: string[];
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
  CANCELED = "CANCELED",
}
