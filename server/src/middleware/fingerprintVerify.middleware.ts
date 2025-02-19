import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";

/**
 * Middleware to verify fingerprint exists for write operations
 * Does not check ownership, only existence
 */
export const verifyFingerprintExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip OPTIONS requests
    if (req.method === "OPTIONS") {
      return next();
    }

    // Get fingerprintId from all possible locations
    const fingerprintId =
      req.params.fingerprintId ||
      req.params.id ||
      req.body.fingerprintId ||
      req.query.fingerprintId;

    if (!fingerprintId) {
      throw new ApiError(400, ERROR_MESSAGES.MISSING_FINGERPRINT);
    }

    // Check if fingerprint exists
    const db = getFirestore();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Set fingerprintId on request for use in route handlers
    req.auth = {
      fingerprint: {
        id: fingerprintId,
        roles: fingerprintDoc.data()?.roles || [],
      },
    };
    next();
  } catch (error) {
    next(error);
  }
};
