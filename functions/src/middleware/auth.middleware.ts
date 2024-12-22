import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { validateApiKey } from "../services/apiKeyService";
import { sendError } from "../utils/response";

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
): Promise<void | Response> => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      throw new ApiError(401, "API key is required");
    }

    if (typeof apiKey !== "string") {
      throw new ApiError(401, "Invalid API key format");
    }

    const result = await validateApiKey(apiKey);
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

    // For non-admin routes, check if the request body contains a fingerprintId and if it matches
    if (
      !relativePath.startsWith("/admin") &&
      !relativePath.startsWith("/visit/log") &&
      req.body?.fingerprintId &&
      req.body.fingerprintId !== result.fingerprintId
    ) {
      throw new ApiError(403, "API key does not match fingerprint");
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return sendError(res, error);
    }
    console.error("Error in auth middleware:", error);
    return sendError(res, "Internal server error");
  }
};
