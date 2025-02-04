import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import {
  createApiKey,
  validateApiKey,
  deactivateApiKey,
  getApiKeyByKey,
} from "../services/apiKey.service";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";
import { ApiKeyRegisterSchema, ApiKeyValidateSchema, ApiKeyDeactivateSchema } from "../schemas";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants";

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
        SUCCESS_MESSAGES.API_KEY_REGISTERED,
      );
    } catch (error) {
      console.error("[Register API Key] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_API_KEY));
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
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VALIDATE_API_KEY));
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

      // Get the API key document first
      const apiKey = await getApiKeyByKey(key);
      if (!apiKey) {
        throw ApiError.from(null, 404, ERROR_MESSAGES.API_KEY_NOT_FOUND);
      }

      // Check if the authenticated user's fingerprint matches the API key's fingerprint
      if (apiKey.fingerprintId !== req.fingerprintId) {
        throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }

      const result = await deactivateApiKey({
        keyId: apiKey.id,
        fingerprintId: apiKey.fingerprintId,
      });
      return sendSuccess(res, result, SUCCESS_MESSAGES.API_KEY_DEACTIVATED);
    } catch (error) {
      console.error("[Deactivate API Key] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DEACTIVATE_API_KEY));
    }
  },
];
