import { Request, Response, NextFunction } from "express";
import { Permission, ERROR_MESSAGES, ROLE } from "../constants";
import { ApiError } from "../utils";
import { roleService } from "../services/role.service";

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

    const isAdmin = await roleService.isAdmin(fingerprintId);
    if (!isAdmin) {
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

      const hasPermission = await roleService.hasPermission(fingerprintId, permission);
      if (!hasPermission) {
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
