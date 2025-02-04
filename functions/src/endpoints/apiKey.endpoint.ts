import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";

import { createApiKey, validateApiKey, deactivateApiKey } from "../services/apiKey.service";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";
import { ApiKeyRegisterSchema, ApiKeyValidateSchema, ApiKeyDeactivateSchema } from "../schemas";

/**
 * Register a new API key
 */
export const register = [
  validateRequest(ApiKeyRegisterSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Register API Key] Starting registration with body:", req.body);
      const { fingerprintId } = req.body;
      const result = await createApiKey(fingerprintId);
      console.log("[Register API Key] Successfully created key:", {
        fingerprintId,
        keyId: result.id,
      });

      return sendSuccess(
        res,
        {
          key: result.key,
          fingerprintId: result.fingerprintId,
          active: result.active,
          createdAt: result.createdAt,
        },
        "API key registered successfully",
      );
    } catch (error) {
      console.error("[Register API Key] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to register API key", 500);
    }
  },
];

/**
 * Validate an API key
 */
export const validate = [
  validateRequest(ApiKeyValidateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Validate API Key] Starting validation with body:", req.body);
      const { key } = req.body;
      const result = await validateApiKey(key);
      console.log("[Validate API Key] Validation result:", result);

      return sendSuccess(res, {
        isValid: result.isValid,
        needsRefresh: result.needsRefresh,
      });
    } catch (error) {
      console.error("[Validate API Key] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to validate API key", 500);
    }
  },
];

/**
 * Deactivate an API key
 */
export const deactivate = [
  validateRequest(ApiKeyDeactivateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key } = req.body;
      const fingerprintId = req.fingerprintId || "";

      const result = await deactivateApiKey({ keyId: key, fingerprintId });
      return sendSuccess(res, result, "API key deactivated successfully");
    } catch (error) {
      console.error("[Deactivate API Key] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });
      return sendError(res, "Failed to deactivate API key", 500);
    }
  },
];
