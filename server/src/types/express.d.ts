import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      profile?: any; // TODO: Import proper Profile type
      accountId?: string;
      walletAddress?: string;
      fingerprintId?: string;
      body: any;
      query: any;
      params: any;
    }
  }
}

export {};
