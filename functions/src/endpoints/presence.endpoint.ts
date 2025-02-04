import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { sendSuccess, sendError } from "../utils/response";
import { updatePresence, getPresence, updateActivity } from "../services/presence.service";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api.constants";
import { PresenceActivitySchema, PresenceGetSchema, PresenceUpdateSchema } from "../schemas";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections.constants";

// Update presence status
export const update = [
  validateRequest(PresenceUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { fingerprintId } = req.params;
      const { status } = req.body;

      // Check if fingerprint exists first
      const db = getFirestore();
      const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();
      if (!doc.exists) {
        return sendError(res, new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
      }

      const presence = await updatePresence({ fingerprintId, status });
      return sendSuccess(res, presence, "Presence status updated");
    } catch (error) {
      return sendError(
        res,
        ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS),
      );
    }
  },
];

// Get current presence status
export const get = [
  validateRequest(PresenceGetSchema),
  async (req: Request, res: Response) => {
    try {
      const { fingerprintId } = req.params;
      const presence = await getPresence({ fingerprintId });
      return sendSuccess(res, presence, "Presence status retrieved");
    } catch (error) {
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_PRESENCE));
    }
  },
];

// Update activity timestamp
export const updateActivityStatus = [
  validateRequest(PresenceActivitySchema),
  async (req: Request, res: Response) => {
    try {
      const { fingerprintId } = req.params;
      const presence = await updateActivity({ fingerprintId });
      return sendSuccess(res, presence, "Activity timestamp updated");
    } catch (error) {
      return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_ACTIVITY));
    }
  },
];
