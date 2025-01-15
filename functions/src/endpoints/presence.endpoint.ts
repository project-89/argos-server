import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validation.middleware";
import { sendError, sendSuccess } from "../utils/response";
import { updatePresence, getPresence, PresenceStatus } from "../services/presenceService";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

const router = Router();

const updatePresenceSchema = z.object({
  params: z.object({
    fingerprintId: z.string(),
  }),
  body: z.object({
    status: z.enum(["online", "offline"] as const),
  }),
});

const getPresenceSchema = z.object({
  params: z.object({
    fingerprintId: z.string(),
  }),
});

router.put("/:fingerprintId", validateRequest(updatePresenceSchema), async (req, res) => {
  try {
    const { fingerprintId } = req.params;
    const { status } = req.body;

    const presence = await updatePresence(fingerprintId, status as PresenceStatus);
    return sendSuccess(res, presence);
  } catch (error) {
    return sendError(
      res,
      error instanceof Error
        ? error
        : new ApiError(500, ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS),
    );
  }
});

router.get("/:fingerprintId", validateRequest(getPresenceSchema), async (req, res) => {
  try {
    const { fingerprintId } = req.params;
    const presence = await getPresence(fingerprintId);
    return sendSuccess(res, presence);
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_GET_PRESENCE),
    );
  }
});

export default router;
