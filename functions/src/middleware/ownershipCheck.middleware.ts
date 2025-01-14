import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

/**
 * Middleware to ensure a caller can only access/modify their own data
 * Requires auth middleware to be run first to set req.fingerprintId
 */
export const verifyOwnership = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip OPTIONS requests
    if (req.method === "OPTIONS") {
      return next();
    }

    const callerFingerprintId = req.fingerprintId;
    const targetFingerprintId = req.params.fingerprintId || req.body.fingerprintId;

    // If no target fingerprint is specified, allow the request
    if (!targetFingerprintId) {
      return next();
    }

    // Verify the caller is accessing their own data
    if (callerFingerprintId !== targetFingerprintId) {
      throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      console.error("Ownership check error:", error);
      next(new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR));
    }
  }
};
