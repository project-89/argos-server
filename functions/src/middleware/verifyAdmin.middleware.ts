import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils";

export const verifyAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId } = req;
    if (!fingerprintId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const db = getFirestore();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const fingerprint = fingerprintDoc.data();
    if (!fingerprint?.roles?.includes("admin")) {
      throw new ApiError(403, ERROR_MESSAGES.ADMIN_REQUIRED);
    }

    next();
  } catch (error) {
    next(error);
  }
};
