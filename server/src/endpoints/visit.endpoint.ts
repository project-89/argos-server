import { Request, Response } from "express";
import { sendError, sendSuccess, ApiError, getClientIp } from "../utils";
import { logVisit, removeSiteAndVisits, getVisitHistory } from "../services";
import { ERROR_MESSAGES } from "../constants";

const LOG_PREFIX = "[Visit Endpoint]";

/**
 * Log a visit
 */
export const handleLogVisit = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Processing visit log request`);
    const { fingerprintId, url, title } = req.body;
    const clientIp = getClientIp(req);

    const result = await logVisit({ fingerprintId, url, title, clientIp });
    return sendSuccess(res, result, "Visit logged successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in log visit:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_LOG_VISIT));
  }
};

/**
 * Remove a site and its visits
 */
export const handleRemoveSite = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Processing site removal request`);
    const { fingerprintId, siteId } = req.body;

    const result = await removeSiteAndVisits({ fingerprintId, siteId });
    return sendSuccess(res, result, "Site and visits removed");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in remove site:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_REMOVE_SITE));
  }
};

/**
 * Get visit history
 */
export const handleGetHistory = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Processing visit history request`);
    const fingerprintId = req.params.fingerprintId;

    const visits = await getVisitHistory({ fingerprintId });
    return sendSuccess(res, { visits }, "Visit history retrieved");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in get visit history:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_VISIT_HISTORY));
  }
};
