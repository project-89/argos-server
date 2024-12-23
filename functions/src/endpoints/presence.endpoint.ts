import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validation.middleware";
import { sendError, sendSuccess } from "../utils/response";
import { updatePresence, getPresence, PresenceStatus } from "../services/presenceService";
import { ApiError } from "../utils/error";

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
    if (error instanceof ApiError) {
      return sendError(res, error);
    }
    return sendError(res, new ApiError(500, "Failed to update presence status"));
  }
});

router.get("/:fingerprintId", validateRequest(getPresenceSchema), async (req, res) => {
  try {
    const { fingerprintId } = req.params;
    const presence = await getPresence(fingerprintId);
    return sendSuccess(res, presence);
  } catch (error) {
    if (error instanceof ApiError) {
      return sendError(res, error);
    }
    return sendError(res, new ApiError(500, "Failed to get presence status"));
  }
});

export default router;
