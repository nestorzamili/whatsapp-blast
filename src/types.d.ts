export interface UserPayload {
  id: string;
  role: string;
  name: string;
  email: string;
}

export interface VerificationResult {
  isValid: boolean;
  payload: UserPayload | null;
  error?: string;
}

declare global {
  type ClientStatus = "INITIALIZING" | "CONNECTED" | "DISCONNECTED" | "IDLE";
  type MessageStatus = "PENDING" | "SENT" | "FAILED";

  interface MessageBase {
    number: string;
    content: string;
  }

  interface WhatsAppClient {
    id: string;
    userId: string;
    session?: string | null;
    status: ClientStatus;
    lastActive?: Date;
    lastQrCode?: string | null;
  }

  interface ClientUpdate
    extends Partial<
      Pick<WhatsAppClient, "status" | "session" | "lastActive" | "lastQrCode">
    > {}
  interface Message extends MessageBase {
    id: string;
  }
  interface MessagePayload extends MessageBase {}
  interface MessageRecord extends Message {
    clientId: string;
    status: MessageStatus;
    error?: string;
  }

  interface BatchProgress {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
  }

  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
