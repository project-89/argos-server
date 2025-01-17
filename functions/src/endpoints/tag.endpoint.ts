import { Request, Response, NextFunction } from "express";
import {
  tagUser as tagUserService,
  hasTag as hasTagService,
  getTagHistory as getTagHistoryService,
  getUserTags as getUserTagsService,
} from "../services/tag.service";
import { sendSuccess } from "../utils/response";
import { ERROR_MESSAGES, ALLOWED_TAG_TYPES } from "../constants/api";
import { ApiError } from "../utils/error";
import { TagUserResponse, GetUserTagsResponse, TagData } from "../types/api.types";

/**
 * Tag another user
 */
export const tagUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetFingerprintId } = req.body;
    const taggerFingerprintId = req.fingerprintId;

    if (!taggerFingerprintId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await tagUserService(
      taggerFingerprintId,
      targetFingerprintId,
      ALLOWED_TAG_TYPES.IT,
    );
    return sendSuccess<TagUserResponse>(res, result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get user's active tags
 */
export const getUserTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId } = req.params;
    const result = await getUserTagsService(fingerprintId);
    return sendSuccess<GetUserTagsResponse>(res, result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get tag history for a user
 */
export const getTagHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId } = req.params;
    const history = await getTagHistoryService(fingerprintId);
    return sendSuccess<{ tags: TagData[] }>(res, { tags: history });
  } catch (error) {
    return next(error);
  }
};

/**
 * Check if user has a specific tag
 */
export const checkTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId, tagType } = req.params;
    const hasTag = await hasTagService(fingerprintId, tagType);
    return sendSuccess<{ hasTag: boolean }>(res, { hasTag });
  } catch (error) {
    return next(error);
  }
};
