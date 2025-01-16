import { Request, Response, NextFunction } from "express";
import {
  tagUser as tagUserService,
  isUserIt as isUserItService,
  getTagHistory as getTagHistoryService,
} from "../services/tagService";
import { sendSuccess } from "../utils/response";
import { ERROR_MESSAGES } from "../constants/api";
import { ApiError } from "../utils/error";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";

const LOG_PREFIX = "[Tag Endpoint]";

/**
 * Tag another user as "it"
 */
export const tagUser = [
  validateRequest(schemas.tagUser),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Processing tag request`);
      const { targetFingerprintId } = req.body;
      const taggerFingerprintId = req.fingerprintId as string;

      const result = await tagUserService(taggerFingerprintId, targetFingerprintId);
      sendSuccess(res, result);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in tagUser:`, error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR));
    }
  },
];

/**
 * Check if a user is currently "it"
 */
export const isUserIt = [
  validateRequest(schemas.presenceGet), // Reuse existing schema since we just need fingerprintId param
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Checking if user is "it"`);
      const fingerprintId = req.params.fingerprintId;

      const isIt = await isUserItService(fingerprintId);
      sendSuccess(res, { isIt });
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in isUserIt:`, error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR));
    }
  },
];

/**
 * Get tag history for a user
 */
export const getTagHistory = [
  validateRequest(schemas.presenceGet), // Reuse existing schema since we just need fingerprintId param
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Getting tag history`);
      const fingerprintId = req.params.fingerprintId;

      const tags = await getTagHistoryService(fingerprintId);
      sendSuccess(res, { tags });
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in getTagHistory:`, error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR));
    }
  },
];
