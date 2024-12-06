import { Request, Response, NextFunction } from "express";
import { validate } from "../endpoints/apiKey.endpoint";
import "../types/express";
import { PUBLIC_ENDPOINTS } from "../constants";

export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Skip validation for test environment
    if (process.env.NODE_ENV === "test") {
      // For test environment, use the test fingerprint ID from headers
      req.fingerprintId = req.headers["x-test-fingerprint-id"] as string;
      return next();
    }

    // Skip validation for emulator if not in test environment
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      return next();
    }

    // Extract the endpoint path from the full URL path
    const fullPath = req.path;
    const endpointPath = fullPath.replace(/^.*\/api/, "");

    // Check if endpoint is public
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => endpointPath.startsWith(endpoint));

    if (isPublicEndpoint) {
      return next();
    }

    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      res.status(401).json({
        success: false,
        error: "Missing API key",
      });
      return;
    }

    const { isValid, fingerprintId } = await validate(apiKey);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
      return;
    }

    // Add fingerprintId to request for use in endpoints
    req.fingerprintId = fingerprintId;
    next();
  } catch (error: any) {
    console.error("Error validating API key:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
