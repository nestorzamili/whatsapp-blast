declare global {
  interface IMessagePayload {
    number: string;
    content: string;
  }

  interface IMessageRecord extends IMessagePayload {
    id: string;
    clientId: string;
    status: "PENDING" | "SENT" | "FAILED";
    error?: string;
  }

  interface IBatchProgress {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
  }

  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
        email: string;
      };
    }
  }

  type UserPayload = {
    id: string;
    role: string;
    name: string;
    email: string;
  };

  type VerificationResult = {
    isValid: boolean;
    payload: UserPayload | null;
    error?: string;
  };
}

export {};
