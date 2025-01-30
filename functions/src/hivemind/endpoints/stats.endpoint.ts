import { Request, Response } from "express";
import { statsService } from "../services/stats.service";
import { validateRequest } from "../../middleware/validation.middleware";
import { hivemindSchemas } from "../types/schemes";
import { sendError, sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/error";

/**
 * Get stats for a profile
 */
export const getStats = [
  validateRequest(hivemindSchemas.statsGet),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Get Stats] Starting with params:", req.params);
      const stats = await statsService.getStats(req.params.profileId);
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
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get stats", 500);
    }
  },
];

/**
 * Update stats for a profile
 */
export const updateStats = [
  validateRequest(hivemindSchemas.statsUpdate),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log("[Update Stats] Starting with:", {
        params: req.params,
        body: req.body,
      });
      const stats = await statsService.updateStats(req.params.profileId, req.body);
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
      if (error instanceof ApiError) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to update stats", 500);
    }
  },
];
