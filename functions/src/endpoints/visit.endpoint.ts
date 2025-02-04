import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { getClientIp } from "../utils/request";
import { sendSuccess } from "../utils/response";
import {
  logVisit,
  updatePresenceStatus,
  removeSiteAndVisits,
  getVisitHistory,
} from "../services/visit.service";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants";
import {
  VisitLogSchema,
  VisitPresenceSchema,
  VisitRemoveSiteSchema,
  VisitHistorySchema,
} from "../schemas";

const LOG_PREFIX = "[Visit Endpoint]";

/**
 * Log a visit
 */
export const log = [
  validateRequest(VisitLogSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Processing visit log request`);
      const { fingerprintId, url, title } = req.body;
      const clientIp = getClientIp(req);

      const result = await logVisit({ fingerprintId, url, title, clientIp });
      sendSuccess(res, result, "Visit logged successfully");
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in log visit:`, error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_LOG_VISIT));
    }
  },
];

/**
 * Update presence status
 */
export const updatePresence = [
  validateRequest(VisitPresenceSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Processing presence update request`);
      const { fingerprintId, status } = req.body;

      const result = await updatePresenceStatus({ fingerprintId, status });
      sendSuccess(res, result, "Presence status updated");
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in update presence:`, error);
      next(
        error instanceof Error
          ? error
          : new ApiError(500, ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS),
      );
    }
  },
];

/**
 * Remove a site and its visits
 */
export const removeSite = [
  validateRequest(VisitRemoveSiteSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Processing site removal request`);
      const { fingerprintId, siteId } = req.body;

      const result = await removeSiteAndVisits({ fingerprintId, siteId });
      sendSuccess(res, result, "Site and visits removed");
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in remove site:`, error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_REMOVE_SITE));
    }
  },
];

/**
 * Get visit history
 */
export const getHistory = [
  validateRequest(VisitHistorySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`${LOG_PREFIX} Processing visit history request`);
      const fingerprintId = req.params.fingerprintId;

      const visits = await getVisitHistory({ fingerprintId });
      sendSuccess(res, { visits }, "Visit history retrieved");
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in get visit history:`, error);
      next(
        error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_GET_VISIT_HISTORY),
      );
    }
  },
];
