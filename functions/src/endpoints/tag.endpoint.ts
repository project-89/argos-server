import { Request, Response } from "express";
import { tagUserBySocialIdentity, getTagLeaderboard, getUserTags } from "../services/tag.service";
import { sendError, sendSuccess } from "../utils/response";
import { ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils/error";

const LOG_PREFIX = "[Tag Endpoint]";

/**
 * Tag a user
 */
export const handleTagUser = async (req: Request, res: Response) => {
  try {
    const { taggerUsername, username: targetUsername, platform } = req.body;
    const { tagType } = req.params;

    const result = await tagUserBySocialIdentity({
      taggerUsername,
      targetUsername,
      platform,
      tagType,
    });

    return sendSuccess(res, result);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in handleTagUser:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};

/**
 * Get user's current tags
 */
export const handleGetUserTags = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { platform = "x" } = req.query;
    const result = await getUserTags(username, platform as "x");
    return sendSuccess(res, result);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in handleGetUserTags:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};

/**
 * Get tag leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { timeframe = "daily", limit = 10, offset = 0 } = req.query;
    const leaderboard = await getTagLeaderboard({
      timeFrame: timeframe as "daily" | "weekly" | "monthly" | "allTime",
      limit: Number(limit),
      offset: Number(offset),
    });
    return sendSuccess(res, leaderboard);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getLeaderboard:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};
