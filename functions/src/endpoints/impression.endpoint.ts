import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import {
  createImpression,
  getImpressions,
  deleteImpressions,
} from "../services/impression.service";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { schemas } from "../types/schemas";

// Extend Request type to include fingerprint
interface AuthenticatedRequest extends Request {
  fingerprintId?: string;
}

// Route handlers
export const create = [
  validateRequest(schemas.impressionCreate),
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, type, data, source, sessionId } = req.body;

      const impression = await createImpression(fingerprintId, type, data, {
        source,
        sessionId,
      });
      return sendSuccess(res, impression, "Impression created successfully", 201);
    } catch (error) {
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_CREATE_IMPRESSION),
      );
    }
  },
];

export const get = [
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const fingerprintId = req.params.fingerprintId;
      const { type } = req.query;

      if (!fingerprintId) {
        throw new ApiError(400, ERROR_MESSAGES.MISSING_FINGERPRINT);
      }

      const options = {
        ...(type && { type: type as string }),
      };

      const impressions = await getImpressions(fingerprintId, options);
      return sendSuccess(res, impressions, "Impressions retrieved successfully");
    } catch (error) {
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_GET_IMPRESSIONS),
      );
    }
  },
];

export const remove = [
  validateRequest(schemas.impressionDelete),
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const fingerprintId = req.params.fingerprintId || req.body.fingerprintId;

      if (!fingerprintId) {
        throw new ApiError(400, ERROR_MESSAGES.MISSING_FINGERPRINT);
      }

      const count = await deleteImpressions(fingerprintId);
      return sendSuccess(res, { count }, "Impressions deleted successfully");
    } catch (error) {
      return sendError(
        res,
        error instanceof Error
          ? error
          : new ApiError(500, ERROR_MESSAGES.FAILED_DELETE_IMPRESSIONS),
      );
    }
  },
];
