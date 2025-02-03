import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api.constants";
import { getFirestore } from "firebase-admin/firestore";
import { sendError } from "../utils/response";
import { COLLECTIONS } from "../constants/collections.constants";

const LOG_PREFIX = "[Ownership Check]";

/**
 * Middleware to verify fingerprint exists
 * Should be run before ownership check
 */
export const verifyFingerprintExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip OPTIONS requests
    if (req.method === "OPTIONS") {
      return next();
    }

    const targetFingerprintId = req.params.fingerprintId || req.params.id || req.body.fingerprintId;

    // If no target fingerprint is specified in body or params, allow the request
    if (!targetFingerprintId) {
      return next();
    }

    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(targetFingerprintId).get();

    if (!doc.exists) {
      return sendError(res, new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure a caller can only access/modify their own data
 * Requires auth middleware to be run first to set req.fingerprintId
 * Admins can bypass ownership checks for all endpoints
 */
export const verifyOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip OPTIONS requests
    if (req.method === "OPTIONS") {
      console.log(`${LOG_PREFIX} Skipping OPTIONS request`);
      return next();
    }

    const callerFingerprintId = req.fingerprintId;
    const targetFingerprintId = req.params.fingerprintId || req.params.id || req.body.fingerprintId;

    console.log(`${LOG_PREFIX} Checking ownership:`, {
      method: req.method,
      path: req.path,
      url: req.url,
      callerFingerprintId,
      targetFingerprintId,
      params: req.params,
      body: req.body,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
    });

    // If no target fingerprint is specified in body or params, allow the request
    // This handles cases like /role/available which don't need a fingerprint
    if (!targetFingerprintId) {
      console.log(`${LOG_PREFIX} No target fingerprint specified, allowing request`);
      return next();
    }

    // Check if target fingerprint exists first
    const db = getFirestore();
    const targetDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(targetFingerprintId).get();
    if (!targetDoc.exists) {
      console.log(`${LOG_PREFIX} Target fingerprint does not exist`);
      return sendError(res, new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
    }

    // Check if caller has admin role - admins can bypass all ownership checks
    const callerDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(callerFingerprintId!).get();
    const callerData = callerDoc.data();

    if (callerData?.roles?.includes("admin")) {
      console.log(`${LOG_PREFIX} Admin user bypassing ownership check`);
      return next();
    }

    // For non-admins, verify ownership
    if (callerFingerprintId !== targetFingerprintId) {
      console.log(`${LOG_PREFIX} Insufficient permissions - fingerprint mismatch`, {
        callerFingerprintId,
        targetFingerprintId,
      });

      // For GET requests, return 401 as it's an authentication issue
      // For modification requests, return 403 as it's a permissions issue
      if (req.method === "GET") {
        return sendError(res, new ApiError(401, ERROR_MESSAGES.INVALID_API_KEY));
      } else {
        return sendError(res, new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
