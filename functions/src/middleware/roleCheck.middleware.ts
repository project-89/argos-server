import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ROLE, ROLE_PERMISSIONS, Permission } from "../constants/roles";
import { sendError } from "../utils/response";

/**
 * Creates middleware to check if the user has the required permission
 * Requires auth middleware to be run first to set req.fingerprintId
 */
export const requirePermission = (requiredPermission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      // In development, bypass admin checks if explicitly requested
      if (
        (process.env.NODE_ENV === "development" || process.env.FUNCTIONS_EMULATOR === "true") &&
        process.env.BYPASS_ROLE_CHECK === "true"
      ) {
        return next();
      }

      const fingerprintId = req.fingerprintId;
      if (!fingerprintId) {
        throw new ApiError(401, "Authentication required");
      }

      const db = getFirestore();
      const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const fingerprint = fingerprintDoc.data();
      if (!fingerprint) {
        throw new ApiError(500, "Invalid fingerprint data");
      }

      const roles = Array.isArray(fingerprint.roles) ? fingerprint.roles : [];

      // Check if any of the user's roles have the required permission
      const hasPermission = roles.some((role: ROLE) => {
        const permissions = ROLE_PERMISSIONS[role];
        return Array.isArray(permissions) && permissions.includes(requiredPermission);
      });

      if (!hasPermission) {
        // For admin permission, use a specific error message
        if (requiredPermission === "admin") {
          throw new ApiError(403, "admin role required");
        }
        throw new ApiError(403, `Required permission '${requiredPermission}' not found`);
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return sendError(res, error);
      }

      console.error("Error in role check middleware:", error);
      return sendError(
        res,
        "Permission check failed: " +
          (error instanceof Error ? error.message : "Unknown error occurred"),
      );
    }
  };
};

// Convenience middleware for requiring admin permission
export const requireAdmin = requirePermission("admin" as Permission);
