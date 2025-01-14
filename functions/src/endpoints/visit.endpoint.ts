import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validation.middleware";
import { getClientIp } from "../services/fingerprintService";
import { sendSuccess, sendError } from "../utils/response";
import {
  logVisit,
  updatePresenceStatus,
  removeSiteAndVisits,
  getVisitHistory,
  verifyFingerprint,
} from "../services/visitService";
import { ApiError } from "../utils/error";

// Validation schemas
const visitSchema = z.object({
  fingerprintId: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
});

const presenceSchema = z.object({
  fingerprintId: z.string(),
  status: z.enum(["online", "offline"] as const, {
    invalid_type_error: "Status must be either 'online' or 'offline'",
    required_error: "Status is required",
  }),
});

const removeSiteSchema = z.object({
  fingerprintId: z.string(),
  siteId: z.string(),
});

const historySchema = z.object({
  fingerprintId: z.string(),
});

// Extend Request type to include fingerprint
interface AuthenticatedRequest extends Request {
  fingerprintId?: string;
}

/**
 * Log a visit
 */
export const log = [
  validateRequest(visitSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fingerprintId, url, title } = req.body;
      const clientIp = getClientIp(req);

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const result = await logVisit(fingerprintId, url, title, clientIp);
      return sendSuccess(res, result, "Visit logged successfully");
    } catch (error) {
      console.error("Error in log visit:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to log visit"),
      );
    }
  },
];

/**
 * Update presence status
 */
export const updatePresence = [
  validateRequest(presenceSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fingerprintId, status } = req.body;

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const result = await updatePresenceStatus(fingerprintId, status);
      return sendSuccess(res, result, "Presence status updated");
    } catch (error) {
      console.error("Error in update presence:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to update presence"),
      );
    }
  },
];

/**
 * Remove a site and its visits
 */
export const removeSite = [
  validateRequest(removeSiteSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fingerprintId, siteId } = req.body;

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const result = await removeSiteAndVisits(fingerprintId, siteId);
      return sendSuccess(res, result, "Site and visits removed");
    } catch (error) {
      console.error("Error in remove site:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to remove site"),
      );
    }
  },
];

/**
 * Get visit history
 */
export const getHistory = [
  // Only validate body if no fingerprintId in params
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.params.fingerprintId) {
      return validateRequest(historySchema)(req, res, next);
    }
    next();
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Try to get fingerprintId from params first, then body
      const fingerprintId = req.params.fingerprintId || req.body.fingerprintId;

      if (!fingerprintId) {
        throw new ApiError(400, "Fingerprint ID is required");
      }

      await verifyFingerprint(fingerprintId, req.fingerprintId);

      const visits = await getVisitHistory(fingerprintId);
      return sendSuccess(res, { visits }, "Visit history retrieved");
    } catch (error) {
      console.error("Error in get visit history:", error);
      return sendError(
        res,
        error instanceof Error ? error : new ApiError(500, "Failed to get visit history"),
      );
    }
  },
];
