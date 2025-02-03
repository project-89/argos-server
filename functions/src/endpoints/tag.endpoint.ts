import { Request, Response, NextFunction } from "express";
import {
  tagUser as tagUserService,
  hasTag as hasTagService,
  getTagHistory as getTagHistoryService,
  getUserTags as getUserTagsService,
  getTagLeaderboard as getTagLeaderboardService,
} from "../services/tag.service";
import { validateRequest } from "../middleware/validation.middleware";
import {
  CheckTagSchema,
  FingerprintParamsSchema,
  GetTagLeaderboardSchema,
  TagUserSchema,
} from "@/schemas";
import { sendSuccess } from "../utils/response";
import { ERROR_MESSAGES, ALLOWED_TAG_TYPES } from "../constants";
import { ApiError } from "../utils/error";
import {
  TagUserResponse,
  GetUserTagsResponse,
  TagData,
  TagLeaderboardResponse,
} from "../types/old-api.types";

type TimeframeType = "daily" | "weekly" | "monthly" | "allTime";

/**
 * Tag another user
 */
export const tagUser = [
  validateRequest(TagUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetFingerprintId } = req.body;
      const taggerFingerprintId = req.fingerprintId;

      if (!taggerFingerprintId) {
        throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      const result = await tagUserService({
        taggerFingerprintId,
        targetFingerprintId,
        tagType: ALLOWED_TAG_TYPES.IT,
      });
      return sendSuccess<TagUserResponse>(res, result);
    } catch (error) {
      return next(error);
    }
  },
];

/**
 * Get user's active tags
 */
export const getUserTags = [
  validateRequest(FingerprintParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fingerprintId } = req.params;
      const result = await getUserTagsService(fingerprintId);
      return sendSuccess<GetUserTagsResponse>(res, result);
    } catch (error) {
      return next(error);
    }
  },
];

/**
 * Get tag history for a user
 */
export const getTagHistory = [
  validateRequest(FingerprintParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fingerprintId } = req.params;
      const history = await getTagHistoryService(fingerprintId);
      return sendSuccess<{ tags: TagData[] }>(res, { tags: history });
    } catch (error) {
      return next(error);
    }
  },
];

/**
 * Check if user has a specific tag
 */
export const checkTag = [
  validateRequest(CheckTagSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fingerprintId, tagType } = req.params;
      const hasTag = await hasTagService({ fingerprintId, tagType });
      return sendSuccess<{ hasTag: boolean }>(res, { hasTag });
    } catch (error) {
      return next(error);
    }
  },
];

/**
 * Get tag leaderboard
 * Public competitive data - no ownership check needed
 */
export const getLeaderboard = [
  validateRequest(GetTagLeaderboardSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timeFrame = (req.query.timeFrame || "allTime") as TimeframeType;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const fingerprintId = req.query.fingerprintId as string | undefined;

      const leaderboard = await getTagLeaderboardService({
        timeFrame,
        limit: limit || 100,
        offset: offset || 0,
        currentUserId: fingerprintId || "",
      });
      return sendSuccess<TagLeaderboardResponse>(res, leaderboard);
    } catch (error) {
      return next(error);
    }
  },
];
