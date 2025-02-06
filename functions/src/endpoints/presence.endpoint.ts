import { Request, Response } from "express";
import { sendSuccess, sendError, ApiError } from "../utils";
import { getPresence, updateActivity, updatePresenceStatus } from "../services";
import { ERROR_MESSAGES } from "../constants";

const LOG_PREFIX = "[Presence Endpoint]";
/**
 * Update presence status
 */
export const handleUpdatePresence = async (req: Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Processing presence update request`);
    const { fingerprintId, status } = req.body;

    const result = await updatePresenceStatus({ fingerprintId, status });
    return sendSuccess(res, result, "Presence status updated");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in update presence:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS));
  }
};

// Get current presence status
export const handleGetPresence = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId } = req.params;
    const presence = await getPresence({ fingerprintId });
    return sendSuccess(res, presence, "Presence status retrieved");
  } catch (error) {
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_PRESENCE));
  }
};

// Update activity timestamp
export const handleUpdateActivityStatus = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { fingerprintId } = req.params;
    const presence = await updateActivity({ fingerprintId });
    return sendSuccess(res, presence, "Activity timestamp updated");
  } catch (error) {
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_ACTIVITY));
  }
};
