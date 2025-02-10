import { Request, Response } from "express";
import { sendError, sendSuccess, ApiError } from "../utils";
import { getStats, updateStats } from "../services";
import { ERROR_MESSAGES } from "../constants";

/**
 * Get stats for a profile
 */
export const handleGetStats = async (req: Request, res: Response) => {
  try {
    console.log("[Get Stats] Starting with params:", req.params);
    const stats = await getStats(req.params.profileId);
    console.log("[Get Stats] Successfully retrieved stats for profile:", {
      profileId: req.params.profileId,
    });
    return sendSuccess(res, stats);
  } catch (error) {
    console.error("[Get Stats] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_STATS));
  }
};

/**
 * Update stats for a profile
 */
export const handleUpdateStats = async (req: Request, res: Response) => {
  try {
    console.log("[Update Stats] Starting with:", {
      params: req.params,
      body: req.body,
    });
    const stats = await updateStats(req.params.profileId, req.body);
    console.log("[Update Stats] Successfully updated stats for profile:", {
      profileId: req.params.profileId,
    });
    return sendSuccess(res, stats, "Stats updated successfully");
  } catch (error) {
    console.error("[Update Stats] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: req.params,
      body: req.body,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_STATS));
  }
};
