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
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

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
      return sendSuccess(res, result, "Fingerprint registered successfully", 201);
    } catch (error) {
      console.error("Error registering fingerprint:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
];

/**
 * Get fingerprint by ID
 */
export const get = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(404, "Not Found");
  }

  try {
    // Verify fingerprint ownership first
    await verifyFingerprint(id, req.fingerprintId);

    const result = await getFingerprintAndUpdateIp(id, req.ip || "unknown");
    return sendSuccess(res, result.data);
  } catch (error) {
    // Let the error middleware handle all errors
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Update fingerprint metadata
 */
export const update = [
  validateRequest(schemas.fingerprintUpdate),
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, metadata } = req.body;
      if (!fingerprintId) {
        throw new ApiError(400, ERROR_MESSAGES.MISSING_FINGERPRINT);
      }

      await verifyFingerprint(fingerprintId);
      const result = await updateFingerprintMetadata(fingerprintId, metadata);

      return sendSuccess(res, result, "Fingerprint metadata updated successfully");
    } catch (error) {
      console.error("Error updating fingerprint:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
];
