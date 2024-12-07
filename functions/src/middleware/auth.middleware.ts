import { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, PUBLIC_ENDPOINTS } from "../constants";

// Helper to check if endpoint is public
const isPublicEndpoint = (path: string): boolean => {
  return PUBLIC_ENDPOINTS.some((endpoint) => path.includes(endpoint));
};

// Middleware to validate API key
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip API key validation for public endpoints
    if (isPublicEndpoint(req.path)) {
      return next();
    }

    // Get API key from header
    const apiKey = req.header("x-api-key");
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "API key is required",
      });
    }

    // Skip database validation in test mode
    if (process.env.NODE_ENV === "test" || req.header("x-test-env") === "true") {
      if (apiKey === "test-api-key") {
        // Add test fingerprint ID to request
        req.fingerprintId = req.header("x-test-fingerprint-id");
        return next();
      }
      return res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
    }

    // Get API key from database
    const db = getFirestore();
    const apiKeyDoc = await db.collection(COLLECTIONS.API_KEYS).doc(apiKey).get();

    // Check if API key exists and is enabled
    if (!apiKeyDoc.exists || !apiKeyDoc.data()?.enabled) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
    }

    // Update API key usage
    await apiKeyDoc.ref.update({
      lastUsed: new Date(),
      usageCount: (apiKeyDoc.data()?.usageCount || 0) + 1,
      endpointStats: {
        ...apiKeyDoc.data()?.endpointStats,
        [req.path]: (apiKeyDoc.data()?.endpointStats?.[req.path] || 0) + 1,
      },
    });

    // Add fingerprint ID to request
    req.fingerprintId = apiKeyDoc.data()?.fingerprintId;

    next();
  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Middleware to validate test environment
export const testAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only apply in test environment
    if (process.env.NODE_ENV === "test" || req.header("x-test-env") === "true") {
      // Get test fingerprint ID from header
      const fingerprintId = req.header("x-test-fingerprint-id");
      if (!fingerprintId) {
        res.status(401).json({
          success: false,
          error: "Test fingerprint ID is required",
        });
        return;
      }

      // Add fingerprint ID to request
      req.fingerprintId = fingerprintId;
    }

    next();
  } catch (error) {
    console.error("Error validating test environment:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
