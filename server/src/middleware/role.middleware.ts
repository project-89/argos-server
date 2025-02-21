import { Request, Response, NextFunction } from "express";
import { Permission, ERROR_MESSAGES, ACCOUNT_ROLE } from "../constants";
import { ApiError } from "../utils";
import { hasPermission as checkHasPermission } from "../services";
import { getAccountById } from "../services/account.service";
const LOG_PREFIX = "[Role Middleware]";

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

/**
 * Middleware to check for specific account roles
 */
export const requireRole = (role: (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === "development" && process.env.BYPASS_ROLE_CHECK === "true") {
        console.log(`${LOG_PREFIX} Bypassing role check in development`);
        return next();
      }

      const accountId = req.params.accountId || req.body.accountId;
      if (!accountId) {
        throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      console.log(`${LOG_PREFIX} Checking role:`, { accountId, role });

      const account = await getAccountById(accountId);
      if (!account) {
        throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
      }

      if (!account.roles.includes(role)) {
        console.log(`${LOG_PREFIX} Role check failed:`, { accountId, role });
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }

      console.log(`${LOG_PREFIX} Role verified:`, { accountId, role });
      next();
    } catch (error) {
      next(error);
    }
  };
};
