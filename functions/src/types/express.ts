// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      fingerprintId?: string;
    }
  }
}

export {};
