// Type augmentation for Express Request
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      fingerprintId?: string;
    }
  }
}

export {};
