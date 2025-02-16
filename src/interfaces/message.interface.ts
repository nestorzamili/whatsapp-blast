export interface IMessagePayload {
  number: string;
  content: string;
}

export interface IMessageRecord extends IMessagePayload {
  id: string;
  clientId: string;
  status: "PENDING" | "SENT" | "FAILED";
  error?: string;
}

export interface IBatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
}
