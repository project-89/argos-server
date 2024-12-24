import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import {
  createImpression,
  getImpressions,
  deleteImpressions,
  verifyFingerprint,
} from "../services/impressionService";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";

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

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const impression = await createImpression(fingerprintId, type, data, {
        source,
        sessionId,
      });

      return sendSuccess(res, impression, "Impression created successfully", 201);
    } catch (error) {
      console.error("Error creating impression:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to create impression"),
      );
    }
  },
];

export const get = [
  // Only validate body if no fingerprintId in params
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.params.fingerprintId) {
      return validateRequest(getImpressionsSchema)(req, res, next);
    }
    next();
  },
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      // Try to get fingerprintId from params first, then body
      const fingerprintId = req.params.fingerprintId || req.body.fingerprintId;

      if (!fingerprintId) {
        throw new ApiError(400, "Fingerprint ID is required");
      }

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const { type, startTime, endTime, limit, sessionId } = req.query;

      const options = {
        type: type as string | undefined,
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sessionId: sessionId as string | undefined,
      };

      const impressions = await getImpressions(fingerprintId, options);
      return sendSuccess(res, impressions, "Impressions retrieved successfully");
    } catch (error) {
      console.error("Error getting impressions:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to get impressions"),
      );
    }
  },
];

export const remove = [
  // Only validate body if no fingerprintId in params
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.params.fingerprintId) {
      return validateRequest(deleteImpressionsSchema)(req, res, next);
    }
    next();
  },
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      // Try to get fingerprintId from params first, then body
      const fingerprintId = req.params.fingerprintId || req.body.fingerprintId;

      if (!fingerprintId) {
        throw new ApiError(400, "Fingerprint ID is required");
      }

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const { type, startTime, endTime, sessionId } = req.query;

      const options = {
        type: type as string | undefined,
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        sessionId: sessionId as string | undefined,
      };

      const count = await deleteImpressions(fingerprintId, options);
      return sendSuccess(res, { deletedCount: count }, "Impressions deleted successfully");
    } catch (error) {
      console.error("Error deleting impressions:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to delete impressions"),
      );
    }
  },
];
