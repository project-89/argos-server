import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/error";
import { ERROR_MESSAGES } from "../../constants/api";
import { sendError } from "../../utils/response";
import { Profile } from "../types/profile.types";
import { profileService } from "../services/profile.service";

// Extend the Request type to include profile
declare global {
  namespace Express {
    interface Request {
      profile?: Profile;
    }
  }
}

const LOG_PREFIX = "[Profile Access Check]";

/**
 * Middleware to verify profile access
 * Requires auth middleware to be run first to set req.fingerprintId
 * Verifies that the requested profile belongs to the caller
 */
export const verifyProfileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    // Skip OPTIONS requests
    if (req.method === "OPTIONS") {
      console.log(`${LOG_PREFIX} Skipping OPTIONS request`);
      return next();
    }

    const callerFingerprintId = req.fingerprintId;
    const profileId = req.params.profileId || req.params.id;

    console.log(`${LOG_PREFIX} Checking profile access:`, {
      method: req.method,
      path: req.path,
      callerFingerprintId,
      profileId,
      params: req.params,
    });

    // If no profile ID specified, allow the request (for creation endpoints)
    if (!profileId) {
      console.log(`${LOG_PREFIX} No profile ID specified, allowing request`);
      return next();
    }

    // Get the profile
    const profile = await profileService.getProfile(profileId);

    // Check if the profile belongs to the caller
    if (profile.fingerprintId !== callerFingerprintId) {
      console.log(`${LOG_PREFIX} Profile does not belong to caller`, {
        profileFingerprintId: profile.fingerprintId,
        callerFingerprintId,
      });
      return sendError(res, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS, 403);
    }

    // Add profile to request for downstream use
    req.profile = profile;
    console.log(`${LOG_PREFIX} Profile access verified`);

    next();
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof ApiError) {
      return sendError(res, error);
    }
    return sendError(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
  }
};
