import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      accountId?: string;
      walletAddress?: string;
      fingerprintId?: string; // Keep for backward compatibility
    }
  }
}
