import { Request, Response } from "express";
import { sendError, sendSuccess, ApiError, getClientIp } from "../utils";
import { ERROR_MESSAGES } from "../constants";
import {
  createFingerprint,
  getFingerprintAndUpdateIp,
  updateFingerprintMetadata,
} from "../services";

const LOG_PREFIX = "[Fingerprint Endpoint]";

export const handleRegisterFingerprint = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(`${LOG_PREFIX} Starting fingerprint registration`);
    const { fingerprint, metadata } = req.body;
    const ip = getClientIp(req);
    const result = await createFingerprint({ fingerprint, ip, metadata });
    console.log(`${LOG_PREFIX} Successfully created fingerprint`);
    return sendSuccess(res, result, "Fingerprint registered successfully", 201);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error registering fingerprint:`, error);

    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_FINGERPRINT));
  }
};

export const handleGetFingerprint = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(`${LOG_PREFIX} Starting fingerprint retrieval`);
    const fingerprintId = req.params.fingerprintId;
    const result = await getFingerprintAndUpdateIp({ fingerprintId, ip: getClientIp(req) });
    console.log(`${LOG_PREFIX} Successfully retrieved fingerprint`);
    return sendSuccess(res, result.data);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error retrieving fingerprint:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_FINGERPRINT));
  }
};

export const handleUpdateFingerprint = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(`${LOG_PREFIX} Starting fingerprint update`);
    const { fingerprintId, metadata } = req.body;
    const result = await updateFingerprintMetadata({ fingerprintId, metadata });
    console.log(`${LOG_PREFIX} Successfully updated fingerprint`);
    return sendSuccess(res, result, "Fingerprint updated successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating fingerprint:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_FINGERPRINT));
  }
};
