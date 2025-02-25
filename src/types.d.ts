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
  type MessageStatus = "PENDING" | "SENT" | "FAILED";

  interface MessageBase {
    number: string;
    content: string;
    mediaUrl?: string | null;
  }

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
    media?: string;
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

  interface ServiceError {
    message: string;
    statusCode: HttpStatus;
    details?: Record<string, any>;
  }

  interface ApiResponse<T = any> {
    status: boolean;
    message: string;
    data?: T | null;
    errors?: string[];
    path?: string;
    code?: string;
  }
}
export {};
