import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { ApiError } from "../utils/error";
import { PredefinedRole, ROLE_PERMISSIONS, Permission } from "../constants/roles";

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
      const hasPermission = roles.some((role: PredefinedRole) => {
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
    } catch (err: unknown) {
      const error = err as Error | ApiError;

      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      console.error("Error in role check middleware:", error);

      return res.status(500).json({
        success: false,
        error: "Permission check failed: " + (error.message || "Unknown error occurred"),
      });
    }
  };
};

// Convenience middleware for requiring admin permission
export const requireAdmin = requirePermission("admin" as Permission);
