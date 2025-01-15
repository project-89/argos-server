import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";
import { sendError, sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import {
  createFingerprint,
  getFingerprintAndUpdateIp,
  updateFingerprintMetadata,
  getClientIp,
} from "../services/fingerprintService";
import { getFirestore } from "firebase-admin/firestore";

const LOG_PREFIX = "[Fingerprint Endpoint]";

export const register = [
  validateRequest(schemas.fingerprintRegister),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting fingerprint registration`);
      const { fingerprint, metadata } = req.body;
      const ip = getClientIp(req);
      const result = await createFingerprint(fingerprint, ip, metadata);
      console.log(`${LOG_PREFIX} Successfully created fingerprint`);
      return sendSuccess(res, result, "Fingerprint registered successfully", 201);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error registering fingerprint:`, error);
      if (error instanceof ApiError) {
        return sendError(res, error, error.statusCode);
      }
      return sendError(res, new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR), 500);
    }
  },
];

export const get = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(`${LOG_PREFIX} Starting fingerprint retrieval`);
    const fingerprintId = req.params.id;

    // Check if fingerprint exists before ownership check
    const db = getFirestore();
    const doc = await db.collection("fingerprints").doc(fingerprintId).get();
    if (!doc.exists) {
      console.log(`${LOG_PREFIX} Fingerprint not found:`, fingerprintId);
      return sendError(res, new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT));
    }

    const result = await getFingerprintAndUpdateIp(fingerprintId, getClientIp(req));
    console.log(`${LOG_PREFIX} Successfully retrieved fingerprint`);
    return sendSuccess(res, result.data);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error retrieving fingerprint:`, error);
    if (error instanceof ApiError) {
      return sendError(res, error, error.statusCode);
    }
    return sendError(res, new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR), 500);
  }
};

export const update = [
  validateRequest(schemas.fingerprintUpdate),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting fingerprint update`);
      const { fingerprintId, metadata } = req.body;
      const result = await updateFingerprintMetadata(fingerprintId, metadata);
      console.log(`${LOG_PREFIX} Successfully updated fingerprint`);
      return sendSuccess(res, result, "Fingerprint updated successfully");
    } catch (error) {
      console.error(`${LOG_PREFIX} Error updating fingerprint:`, error);
      if (error instanceof ApiError) {
        return sendError(res, error, error.statusCode);
      }
      return sendError(res, new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR), 500);
    }
  },
];
