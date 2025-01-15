import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { createImpression, getImpressions, deleteImpressions } from "../services/impressionService";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

// Schemas
const createImpressionSchema = z.object({
  fingerprintId: z.string({
    required_error: "Fingerprint ID is required",
  }),
  type: z.string({
    required_error: "Type is required",
  }),
  data: z.record(z.any(), {
    required_error: "Data is required",
  }),
  source: z.string().optional(),
  sessionId: z.string().optional(),
});

const getImpressionsSchema = z.object({
  fingerprintId: z.string({
    required_error: "Fingerprint ID is required",
  }),
  type: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().positive().optional(),
  sessionId: z.string().optional(),
});

const deleteImpressionsSchema = z.object({
  fingerprintId: z.string({
    required_error: "Fingerprint ID is required",
  }),
  type: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  sessionId: z.string().optional(),
});

// Extend Request type to include fingerprint
interface AuthenticatedRequest extends Request {
  fingerprintId?: string;
}

// Route handlers
export const create = [
  validateRequest(createImpressionSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, type, data, source, sessionId } = createImpressionSchema.parse(
        req.body,
      );

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
  validateRequest(getImpressionsSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const fingerprintId = req.params.fingerprintId || req.body.fingerprintId;

      if (!fingerprintId) {
        throw new ApiError(400, ERROR_MESSAGES.MISSING_FINGERPRINT);
      }

      const impressions = await getImpressions(fingerprintId);
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
  validateRequest(deleteImpressionsSchema),
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
