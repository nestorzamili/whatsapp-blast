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
  type ClientStatus = "INITIALIZING" | "CONNECTED" | "DISCONNECTED" | "LOGOUT";
  type MessageStatus = "PENDING" | "SENT" | "FAILED";

  interface MessageBase {
    number: string;
    content: string;
    mediaUrl?: string | null; // Change this to allow null
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
    clientId: string;
    status: MessageStatus;
    error: string | null;
    createdAt: Date;
  }
  interface MessagePayload {
    numbers: string[];
    content: string;
    media?: string; // Ubah tipe menjadi string saja untuk URL
  }
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

  interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    format: string;
  }

  interface FileSystemError extends Error {
    code?: string;
  }
}
export {};
