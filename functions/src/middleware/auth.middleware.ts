import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "../endpoints/apiKey.endpoint";
import { PUBLIC_ENDPOINTS } from "../constants";

// Middleware to validate API key
export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Skip validation for public endpoints
    const path = req.path.replace(/\/$/, ""); // Remove trailing slash if present
    if (PUBLIC_ENDPOINTS.includes(path)) {
      next();
      return;
    }

    // Get API key from header
    const apiKey = req.header("x-api-key");
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: "API key is required",
      });
      return;
    }

    // Validate API key
    const { isValid, fingerprintId } = await validateApiKey(apiKey);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
      return;
    }

    // Check if the API key's fingerprint matches the requested fingerprint
    const requestedFingerprintId = req.body.fingerprintId || req.params.fingerprintId;
    if (requestedFingerprintId && requestedFingerprintId !== fingerprintId) {
      res.status(403).json({
        success: false,
        error: "API key does not match fingerprint",
      });
      return;
    }

    // Add fingerprint ID to request
    req.fingerprintId = fingerprintId;
    next();
  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
