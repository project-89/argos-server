import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { validateApiKey } from "../services/apiKeyService";

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
      throw new ApiError(401, "API key is required");
    }

    // Pass the raw header value to validateApiKey, which will handle type checking
    const result = await validateApiKey(apiKey as string);

    if (!result.isValid) {
      // If we have a fingerprintId but the key is invalid, it means the key exists but needs refresh
      if (result.needsRefresh) {
        throw new ApiError(401, "API key needs to be refreshed");
      }
      throw new ApiError(401, "Invalid API key");
    }

    if (!result.fingerprintId) {
      throw new ApiError(500, "Invalid API key data");
    }

    // Set fingerprintId on request for use in other middleware/routes
    req.fingerprintId = result.fingerprintId;

    // Get the relative path from the request
    const relativePath = req.path;

    // For non-admin routes, check if the request contains a fingerprintId (in body or params) and if it matches
    if (!relativePath.startsWith("/admin") && !relativePath.startsWith("/visit/log")) {
      const requestFingerprintId = req.body?.fingerprintId || req.params?.fingerprintId;
      if (requestFingerprintId && requestFingerprintId !== result.fingerprintId) {
        throw new ApiError(403, "API key does not match fingerprint");
      }
    }

    next();
  } catch (error) {
    // Pass errors to the error handling middleware
    if (error instanceof ApiError) {
      next(error);
    } else {
      console.error("Auth middleware error:", error);
      next(new ApiError(500, "Internal server error"));
    }
  }
};
