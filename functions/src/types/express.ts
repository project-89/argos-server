// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      fingerprintId?: string;
    }
  }
}

import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  fingerprint?: {
    id: string;
  };
}

export {};
