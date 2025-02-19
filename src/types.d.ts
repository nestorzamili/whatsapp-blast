declare global {
  type ClientStatus = "INITIALIZING" | "CONNECTED" | "DISCONNECTED" | "IDLE";
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
  }

  interface FileSystemError extends Error {
    code?: string;
  }

  interface UserPayload {
    id: string;
    role: string;
    name: string;
    email: string;
  }

  interface VerificationResult {
    isValid: boolean;
    payload: UserPayload | null;
    error?: string;
  }
}

// Add module declarations
declare module "cors" {
  import { RequestHandler } from "express";
  function cors(): RequestHandler;
  export = cors;
}

declare module "morgan" {
  import { RequestHandler } from "express";
  function morgan(format: string, options?: any): RequestHandler;
  export = morgan;
}

declare module "jsonwebtoken" {
  export function sign(payload: any, secret: string, options?: any): string;
  export function verify(token: string, secret: string): any;
}

declare module "nodemailer" {
  export function createTransport(config: any): any;
}

declare module "qrcode-terminal" {
  export function generate(text: string, options?: { small: boolean }): void;
}

export {};
