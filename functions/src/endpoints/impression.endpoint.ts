import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import {
  createImpression,
  getImpressions,
  deleteImpressions,
} from "../services/impression.service";
import { sendSuccess, sendError } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants";
import { GetImpressionsSchema, DeleteImpressionsSchema, CreateImpressionSchema } from "../schemas";

// Route handlers
export const create = [
  validateRequest(CreateImpressionSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, type, data, source, sessionId } = req.body;
      const impression = await createImpression({
        fingerprintId,
        type,
        data,
        options: { source, sessionId },
      });
      return sendSuccess(res, impression, SUCCESS_MESSAGES.IMPRESSION_CREATED, 201);
    } catch (error) {
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_CREATE_IMPRESSION));
    }
  },
];

export const get = [
  validateRequest(GetImpressionsSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const fingerprintId = req.params.fingerprintId;
      const { type } = req.query;

      const options = {
        ...(type && { type: type as string }),
      };

      const impressions = await getImpressions({ fingerprintId, options });
      return sendSuccess(res, impressions, SUCCESS_MESSAGES.IMPRESSIONS_RETRIEVED);
    } catch (error) {
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_IMPRESSIONS));
    }
  },
];

export const remove = [
  validateRequest(DeleteImpressionsSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const fingerprintId = req.params.fingerprintId || req.body.fingerprintId;
      const count = await deleteImpressions(fingerprintId);
      return sendSuccess(res, { count }, SUCCESS_MESSAGES.IMPRESSIONS_DELETED);
    } catch (error) {
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_DELETE_IMPRESSIONS));
    }
  },
];
