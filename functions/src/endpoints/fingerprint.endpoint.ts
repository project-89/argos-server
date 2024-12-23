import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";
import {
  createFingerprint,
  getFingerprintAndUpdateIp,
  getClientIp,
  verifyFingerprint,
  updateFingerprintMetadata,
} from "../services/fingerprintService";
import { sendSuccess, sendError, sendWarning } from "../utils/response";

// Extend Request type to include fingerprint
interface AuthenticatedRequest extends Request {
  fingerprintId?: string;
}

/**
 * Register a new fingerprint
 */
export const register = [
  validateRequest(schemas.fingerprintRegister),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprint, metadata } = req.body;
      const ip = getClientIp(req);

      const result = await createFingerprint(fingerprint, ip, metadata);
      return sendSuccess(res, { id: result.id }, "Fingerprint registered successfully", 201);
    } catch (error) {
      console.error("Error registering fingerprint:", error);
      return sendError(res, error instanceof Error ? error : "Failed to register fingerprint");
    }
  },
];

/**
 * Get fingerprint by ID
 */
export const get = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    await verifyFingerprint(id, req.fingerprintId);

    const { data, isSuspicious } = await getFingerprintAndUpdateIp(id, ip);

    if (isSuspicious) {
      return sendWarning(res, data, "Suspicious IP activity detected", 200);
    }

    return sendSuccess(res, data, "Fingerprint retrieved successfully", 200);
  } catch (error) {
    console.error("Error getting fingerprint:", error);
    return sendError(res, error instanceof Error ? error : "Failed to get fingerprint");
  }
};

/**
 * Update fingerprint metadata
 */
export const update = [
  validateRequest(schemas.fingerprintUpdate),
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { metadata } = req.body;
      const fingerprintId = req.fingerprintId!;

      await verifyFingerprint(fingerprintId);
      const result = await updateFingerprintMetadata(fingerprintId, metadata);

      return sendSuccess(res, result, "Fingerprint metadata updated successfully");
    } catch (error) {
      console.error("Error updating fingerprint:", error);
      return sendError(res, error instanceof Error ? error : "Failed to update fingerprint");
    }
  },
];
