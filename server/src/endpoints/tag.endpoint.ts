import { Request, Response } from "express";
import { tagUserBySocialIdentity, getTagLeaderboard, getUserTags } from "../services";
import { sendError, sendSuccess, ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";
import { hashSocialIdentity } from "../utils/hash";

const LOG_PREFIX = "[Tag Endpoint]";

/**
 * Tag a user
 */
export const handleTagUser = async (req: Request, res: Response) => {
  try {
    const { taggerUsername, username: targetUsername, platform = "x" } = req.body;
    const { tagType } = req.params;

    const taggerIdentity = hashSocialIdentity(platform, taggerUsername);
    const targetIdentity = hashSocialIdentity(platform, targetUsername);

    const result = await tagUserBySocialIdentity({
      taggerUsername: taggerIdentity.hashedUsername,
      targetUsername: targetIdentity.hashedUsername,
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
    const identity = hashSocialIdentity(platform as "x", username);
    const result = await getUserTags(identity.hashedUsername, platform as "x");
    return sendSuccess(res, result);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in handleGetUserTags:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
};

/**
 * Get tag leaderboard
 */
export const handleGetLeaderboard = async (req: Request, res: Response) => {
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
