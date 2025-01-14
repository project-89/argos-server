import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";
import { createApiKey, validateApiKey, revokeApiKey } from "../services/apiKeyService";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";

/**
 * Register a new API key
 */
export const register = [
  validateRequest(schemas.apiKeyRegister),
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
  validateRequest(schemas.apiKeyValidate),
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
 * Revoke an API key
 */
export const revoke = [
  validateRequest(schemas.apiKeyRevoke),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Revoke API Key] Starting revocation with:", {
        body: req.body,
        fingerprintId: req.fingerprintId,
      });
      const { key } = req.body;
      const fingerprintId = req.fingerprintId;

      if (!fingerprintId) {
        console.log("[Revoke API Key] No fingerprintId in request");
        return sendError(res, "Authentication required", 401);
      }

      await revokeApiKey(key, fingerprintId);
      console.log("[Revoke API Key] Successfully revoked key:", { key, fingerprintId });

      return sendSuccess(res, null, "API key revoked successfully");
    } catch (error) {
      console.error("[Revoke API Key] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
        fingerprintId: req.fingerprintId,
      });
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to revoke API key", 500);
    }
  },
];
