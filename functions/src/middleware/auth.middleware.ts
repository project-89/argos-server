import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";
import { validateApiKey } from "../endpoints/apiKey.endpoint";

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
      // If we have a fingerprintId but the key is invalid, it means the key exists but is disabled
      if (result.fingerprintId) {
        throw new ApiError(404, "API key not found or already revoked");
      }
      throw new ApiError(401, "Invalid API key");
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
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }
    console.error("Error in auth middleware:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
