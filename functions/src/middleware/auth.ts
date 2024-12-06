import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "../services/apiKeyService";
import "../types/express";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      res.status(401).json({
        success: false,
        error: "Missing API key",
      });
      return;
    }

    const result = await validateApiKey(apiKey);

    if (!result.isValid) {
      res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
      return;
    }

    // Add fingerprintId to request for use in endpoints
    req.fingerprintId = result.fingerprintId;
    next();
  } catch (error: any) {
    console.error("Error validating API key:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
