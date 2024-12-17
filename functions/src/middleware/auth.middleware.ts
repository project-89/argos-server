import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "../endpoints/apiKey.endpoint";
import { PUBLIC_ENDPOINTS } from "../constants";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

// Middleware to validate API key
export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Skip validation for public endpoints
    const path = req.path.replace(/\/$/, ""); // Remove trailing slash if present
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((publicPath) => {
      // If the public path has a parameter (e.g., /price/history/:tokenId)
      if (publicPath.includes(":")) {
        const publicPathRegex = new RegExp("^" + publicPath.replace(/:[^/]+/g, "[^/]+") + "$");
        return publicPathRegex.test(path);
      }
      // For exact matches
      return path === publicPath;
    });

    if (isPublicEndpoint) {
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
    if (!isValid || !fingerprintId) {
      res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
      return;
    }

    // Check if the requested fingerprint exists
    const requestedFingerprintId =
      req.params.id || req.params.fingerprintId || req.body?.fingerprintId;
    if (requestedFingerprintId) {
      const db = getFirestore();
      const fingerprintDoc = await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(requestedFingerprintId)
        .get();

      if (!fingerprintDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
        return;
      }

      // Only verify ownership if the fingerprint exists
      if (requestedFingerprintId !== fingerprintId) {
        res.status(403).json({
          success: false,
          error: "API key does not match fingerprint",
        });
        return;
      }
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
