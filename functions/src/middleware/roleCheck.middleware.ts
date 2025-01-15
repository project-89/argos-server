import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ROLE, ROLE_PERMISSIONS, Permission } from "../constants/roles";

/**
 * Creates middleware to check if the user has the required permission
 * Requires auth middleware to be run first to set req.fingerprintId
 */
export const requirePermission = (requiredPermission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In development, bypass admin checks if explicitly requested
      if (process.env.NODE_ENV === "development" && process.env.BYPASS_ROLE_CHECK === "true") {
        return next();
      }

      const fingerprintId = req.fingerprintId;
      if (!fingerprintId) {
        throw new ApiError(401, "Authentication required");
      }

      const db = getFirestore();
      const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

      // Check fingerprint existence first
      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const fingerprint = fingerprintDoc.data();
      if (!fingerprint) {
        throw new ApiError(500, "Invalid fingerprint data");
      }

      const roles = Array.isArray(fingerprint.roles) ? fingerprint.roles : [];

      // Admin role has all permissions
      if (roles.includes(ROLE.ADMIN)) {
        return next();
      }

      // Check if any of the user's roles have the required permission
      const hasPermission = roles.some((role: ROLE) => {
        const permissions = ROLE_PERMISSIONS[role];
        return Array.isArray(permissions) && permissions.includes(requiredPermission);
      });

      if (!hasPermission) {
        // For admin permission, use a specific error message
        if (requiredPermission === "admin") {
          throw new ApiError(403, "Admin role required");
        }
        throw new ApiError(403, `Required permission '${requiredPermission}' not found`);
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        return next(error instanceof ApiError ? error : new ApiError(500, error.message));
      }
      return next(new ApiError(500, "Unknown error occurred"));
    }
  };
};

// Convenience middleware for requiring admin permission
export const requireAdmin = requirePermission("admin" as Permission);
