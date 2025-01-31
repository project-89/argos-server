import { Router } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { sendError, sendSuccess } from "../utils/response";
import { updatePresence, getPresence, updateActivity } from "../services/presence.service";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { verifyOwnership } from "../middleware/ownershipCheck.middleware";
import { schemas } from "../schemas/schemas";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";

const router = Router();

// Update presence status
router.put(
  "/:fingerprintId",
  validateRequest(schemas.presenceUpdate),
  async (req, res, next) => {
    try {
      const { fingerprintId } = req.params;
      // Check if fingerprint exists first
      const db = getFirestore();
      const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();
      if (!doc.exists) {
        return sendError(res, new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND));
      }
      return next();
    } catch (error) {
      return sendError(res, new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR));
    }
  },
  verifyOwnership,
  async (req, res) => {
    try {
      const { fingerprintId } = req.params;
      const { status } = req.body;

      const presence = await updatePresence(fingerprintId, status);
      return sendSuccess(res, presence, "Presence status updated");
    } catch (error) {
      return sendError(
        res,
        error instanceof Error
          ? error
          : new ApiError(500, ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS),
      );
    }
  },
);

// Get current presence status
router.get(
  "/:fingerprintId",
  validateRequest(schemas.presenceGet),
  verifyOwnership,
  async (req, res) => {
    try {
      const { fingerprintId } = req.params;
      const presence = await getPresence(fingerprintId);
      return sendSuccess(res, presence, "Presence status retrieved");
    } catch (error) {
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_GET_PRESENCE),
      );
    }
  },
);

// Update activity timestamp
router.post(
  "/:fingerprintId/activity",
  validateRequest(schemas.presenceActivity),
  verifyOwnership,
  async (req, res) => {
    try {
      const { fingerprintId } = req.params;
      const presence = await updateActivity(fingerprintId);
      return sendSuccess(res, presence, "Activity timestamp updated");
    } catch (error) {
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_UPDATE_ACTIVITY),
      );
    }
  },
);

export default router;
