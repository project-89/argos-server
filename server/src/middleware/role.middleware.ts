import { Request, Response, NextFunction } from "express";
import { Permission, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils";
import { isAdmin as checkIsAdmin, hasPermission as checkHasPermission } from "../services";
const LOG_PREFIX = "[Role Middleware]";

/**
 * Middleware to verify admin role
 */
export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId } = req.body;
    if (!fingerprintId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    console.log(`${LOG_PREFIX} Verifying admin role:`, { fingerprintId });

    const adminStatus = await checkIsAdmin(fingerprintId);
    if (!adminStatus) {
      console.log(`${LOG_PREFIX} Admin verification failed:`, { fingerprintId });
      throw new ApiError(403, ERROR_MESSAGES.ADMIN_REQUIRED);
    }

    console.log(`${LOG_PREFIX} Admin role verified:`, { fingerprintId });
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === "development" && process.env.BYPASS_ROLE_CHECK === "true") {
        console.log(`${LOG_PREFIX} Bypassing permission check in development`);
        return next();
      }

      const { fingerprintId } = req.body;
      if (!fingerprintId) {
        throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      console.log(`${LOG_PREFIX} Checking permission:`, { fingerprintId, permission });

      const permissionGranted = await checkHasPermission(fingerprintId, permission);
      if (!permissionGranted) {
        console.log(`${LOG_PREFIX} Permission check failed:`, { fingerprintId, permission });
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }

      console.log(`${LOG_PREFIX} Permission verified:`, { fingerprintId, permission });
      next();
    } catch (error) {
      next(error);
    }
  };
};
