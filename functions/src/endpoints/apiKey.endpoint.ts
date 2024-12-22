import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";
import { createApiKey, validateApiKey, revokeApiKey } from "../services/apiKeyService";
import { sendSuccess, sendError } from "../utils/response";

/**
 * Register a new API key
 */
export const register = [
  validateRequest(schemas.apiKeyRegister),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId } = req.body;
      const result = await createApiKey(fingerprintId);

      return sendSuccess(
        res,
        {
          key: result.key,
          fingerprintId: result.fingerprintId,
        },
        "API key registered successfully",
      );
    } catch (error) {
      console.error("Error in register API key:", error);
      return sendError(res, error instanceof Error ? error : "Failed to register API key");
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
      const { key } = req.body;
      const result = await validateApiKey(key);

      return sendSuccess(res, {
        isValid: result.isValid,
        needsRefresh: result.needsRefresh,
      });
    } catch (error) {
      console.error("Error in validate API key:", error);
      return sendError(res, error instanceof Error ? error : "Failed to validate API key");
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
      const { key } = req.body;
      const fingerprintId = req.fingerprintId;

      if (!fingerprintId) {
        return sendError(res, "Authentication required", 401);
      }

      await revokeApiKey(key, fingerprintId);
      return sendSuccess(res, { message: "API key revoked successfully" });
    } catch (error) {
      console.error("Error in revoke API key:", error);
      return sendError(res, error instanceof Error ? error : "Failed to revoke API key");
    }
  },
];
