import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { getFirestore } from "firebase-admin/firestore";
import { sendError } from "../utils/response";

const LOG_PREFIX = "[Ownership Check]";

// Endpoints that admins can access without ownership verification
const ADMIN_BYPASS_ENDPOINTS = ["/role/assign", "/role/remove", "/tag/update", "/tag/rules"];

/**
 * Middleware to ensure a caller can only access/modify their own data
 * Requires auth middleware to be run first to set req.fingerprintId
 * Admins can bypass ownership checks for role management endpoints
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
      callerFingerprintId,
      targetFingerprintId,
    });

    // If no target fingerprint is specified in body or params, allow the request
    // This handles cases like /role/available which don't need a fingerprint
    if (!targetFingerprintId) {
      console.log(`${LOG_PREFIX} No target fingerprint specified, allowing request`);
      return next();
    }

    // Check if this is an admin-bypass endpoint
    if (ADMIN_BYPASS_ENDPOINTS.some((endpoint) => req.path.includes(endpoint))) {
      // Check if caller has admin role
      const db = getFirestore();
      const callerDoc = await db.collection("fingerprints").doc(callerFingerprintId!).get();
      const callerData = callerDoc.data();

      if (callerData?.roles?.includes("admin")) {
        console.log(`${LOG_PREFIX} Admin user bypassing ownership check`);
        return next();
      }
    }

    // For non-admins or non-admin endpoints, verify ownership
    if (callerFingerprintId !== targetFingerprintId) {
      console.log(`${LOG_PREFIX} Insufficient permissions - fingerprint mismatch`, {
        callerFingerprintId,
        targetFingerprintId,
      });
      return sendError(res, new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS));
    }

    next();
  } catch (error) {
    next(error);
  }
};
