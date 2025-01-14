import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { validateApiKey, getApiKeyByKey } from "../services/apiKeyService";
import { ERROR_MESSAGES } from "../constants/api";

// Extend Express Request type to include fingerprintId
declare global {
  namespace Express {
    interface Request {
      fingerprintId?: string; // This represents the caller's fingerprint ID
    }
  }
}

// List of public endpoints that don't require an API key
const PUBLIC_ENDPOINTS = ["/fingerprint/register", "/api-key/register", "/api-key/validate"];

/**
 * Middleware to validate API key and set caller's fingerprintId on request
 * - Public routes: No API key required
 * - All other routes: Require valid API key, sets caller's fingerprintId
 */
export const validateApiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check if this is a public endpoint
    if (PUBLIC_ENDPOINTS.some((endpoint) => req.path.startsWith(endpoint))) {
      return next();
    }

    // For all other routes, API key is required
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      throw new ApiError(401, ERROR_MESSAGES.MISSING_API_KEY);
    }

    // First check if the API key exists and get its details
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

    // Set the caller's fingerprint ID - this identifies who is making the request
    req.fingerprintId = apiKeyDetails.fingerprintId;

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
