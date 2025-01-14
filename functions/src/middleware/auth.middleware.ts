import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { validateApiKey, getApiKeyByKey } from "../services/apiKeyService";
import { ERROR_MESSAGES } from "../constants/api";

// Extend Express Request type to include fingerprintId
declare global {
  namespace Express {
    interface Request {
      fingerprintId?: string;
    }
  }
}

/**
 * Middleware to validate API key and set fingerprintId on request
 */
export const validateApiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      throw new ApiError(401, ERROR_MESSAGES.MISSING_API_KEY);
    }

    // First check if the API key exists
    const apiKeyDetails = await getApiKeyByKey(apiKey as string);
    if (!apiKeyDetails) {
      throw new ApiError(401, ERROR_MESSAGES.INVALID_API_KEY);
    }

    // Then validate the API key
    const validationResult = await validateApiKey(apiKey as string);
    if (!validationResult.isValid && validationResult.needsRefresh) {
      throw new ApiError(401, "API key needs to be refreshed");
    }

    if (!apiKeyDetails.fingerprintId) {
      throw new ApiError(500, "Invalid API key data");
    }

    // Set fingerprintId on request for use in other middleware/routes
    req.fingerprintId = apiKeyDetails.fingerprintId;

    // Get the relative path from the request
    const relativePath = req.path;

    // For non-admin routes, check if the request contains a fingerprintId (in body or params) and if it matches
    if (!relativePath.startsWith("/admin") && !relativePath.startsWith("/visit/log")) {
      const requestFingerprintId =
        req.body?.fingerprintId || req.params?.fingerprintId || req.params?.id;
      if (requestFingerprintId && requestFingerprintId !== apiKeyDetails.fingerprintId) {
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }
    }

    next();
  } catch (error) {
    // Pass errors to the error handling middleware
    if (error instanceof ApiError) {
      next(error);
    } else {
      console.error("Auth middleware error:", error);
      next(new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR));
    }
  }
};
