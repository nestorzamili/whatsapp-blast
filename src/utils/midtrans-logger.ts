import logger from "../config/logger";

/**
 * Specialized logger for Midtrans operations
 * This centralizes all Midtrans logging to ensure consistent format and levels
 */
export const midtransLogger = {
  /**
   * Log initialization events
   */
  init: (mode: string) => {
    logger.info(`Midtrans initialized in ${mode} mode`);
  },

  /**
   * Log transaction creation
   */
  createTransaction: {
    start: (userId: string, quotaAmount: number) => {
      logger.info(
        `Creating midtrans transaction for user ${userId}, amount: ${quotaAmount}`
      );
    },
    userNotFound: (userId: string) => {
      logger.error(`User not found for transaction: ${userId}`);
    },
    quotaNotFound: (userId: string) => {
      logger.error(`Quota not found for user: ${userId}`);
    },
    created: (orderId: string, transactionId: string, amount: number) => {
      logger.info(
        `Created transaction: ${transactionId}, orderId: ${orderId}, amount: ${amount} IDR`
      );
    },
    tokenReceived: (orderId: string) => {
      logger.debug(`Midtrans token received for order: ${orderId}`);
    },
    error: (error: any, context?: string) => {
      logger.error(
        `Failed to create transaction${context ? ` (${context})` : ""}:`,
        error
      );
    },
  },

  /**
   * Log notification processing
   */
  notification: {
    received: (orderId: string, status: string) => {
      logger.info(
        `Received midtrans notification for order ${orderId}, status: ${status}`
      );
    },
    debug: (data: any) => {
      if (logger.level === "debug") {
        logger.debug(`Notification data: ${JSON.stringify(data, null, 2)}`);
      }
    },
    invalidSignature: (orderId: string) => {
      logger.error(`Invalid signature for notification: ${orderId}`);
    },
    transactionNotFound: (orderId: string) => {
      logger.error(`Transaction not found for notification: ${orderId}`);
    },
    statusChange: (
      transactionId: string,
      oldStatus: string,
      newStatus: string
    ) => {
      logger.info(
        `Transaction ${transactionId} status changed from ${oldStatus} to ${newStatus}`
      );
    },
    quotaAdded: (transactionId: string, quotaAmount: number) => {
      logger.info(
        `Added ${quotaAmount} quota from transaction: ${transactionId}`
      );
    },
    alreadyProcessed: (transactionId: string) => {
      logger.warn(
        `Transaction ${transactionId} already processed, skipping quota addition`
      );
    },
    updated: (transactionId: string) => {
      logger.debug(`Transaction ${transactionId} successfully updated`);
    },
    error: (error: any, orderId?: string) => {
      logger.error(
        `Error processing notification${
          orderId ? ` for order ${orderId}` : ""
        }:`,
        error
      );
    },
  },

  /**
   * Log API request to Midtrans
   */
  api: {
    request: (endpoint: string, orderId: string) => {
      logger.debug(
        `Sending request to Midtrans ${endpoint} for order: ${orderId}`
      );
    },
    success: (endpoint: string, orderId: string) => {
      logger.debug(
        `Successful Midtrans API call to ${endpoint} for order: ${orderId}`
      );
    },
    error: (endpoint: string, orderId: string, error: any) => {
      logger.error(
        `Midtrans API error to ${endpoint} for order ${orderId}:`,
        error
      );
    },
  },

  /**
   * Log transaction status queries
   */
  status: {
    request: (orderId: string) => {
      logger.debug(`Getting transaction status for order: ${orderId}`);
    },
    notFound: (orderId: string) => {
      logger.warn(`Transaction not found: ${orderId}`);
    },
    retrieved: (orderId: string, status: string) => {
      logger.debug(`Retrieved transaction ${orderId} with status: ${status}`);
    },
    error: (orderId: string, error: any) => {
      logger.error(`Error getting transaction status for ${orderId}:`, error);
    },
  },

  /**
   * General errors
   */
  error: (message: string, error: any) => {
    logger.error(message, error);
  },
};
