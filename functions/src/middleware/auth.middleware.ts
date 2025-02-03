import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api.constants";
import { validateApiKey, getApiKeyByKey } from "../services/apiKey.service";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections.constants";

/**
 * Middleware to validate API key and set fingerprintId on request
 * Only checks if API key exists and is valid (not expired/revoked)
 */
export const validateApiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      throw new ApiError(401, ERROR_MESSAGES.MISSING_API_KEY);
    }

    // First get the API key details to get the fingerprintId
    const apiKeyDetails = await getApiKeyByKey(apiKey);
    if (!apiKeyDetails) {
      throw new ApiError(401, ERROR_MESSAGES.INVALID_API_KEY);
    }

    // Verify the fingerprint still exists
    const db = getFirestore();
    const fingerprintDoc = await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .doc(apiKeyDetails.fingerprintId)
      .get();
    if (!fingerprintDoc.exists) {
      throw new ApiError(401, ERROR_MESSAGES.INVALID_API_KEY);
    }

    // Then validate the API key is active
    const validationResult = await validateApiKey(apiKey);
    if (!validationResult.isValid) {
      throw new ApiError(401, ERROR_MESSAGES.INVALID_API_KEY);
    }

    // Set fingerprintId on request for ownership checks
    req.fingerprintId = apiKeyDetails.fingerprintId;
    next();
  } catch (error) {
    next(error);
  }
};
