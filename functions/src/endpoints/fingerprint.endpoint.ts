import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import {
  FingerprintParamsSchema,
  FingerprintRegisterSchema,
  FingerprintUpdateSchema,
} from "../schemas";
import { sendError, sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants";
import {
  createFingerprint,
  getFingerprintAndUpdateIp,
  updateFingerprintMetadata,
} from "../services/fingerprint.service";
import { getClientIp } from "../utils/request";

const LOG_PREFIX = "[Fingerprint Endpoint]";

export const register = [
  validateRequest(FingerprintRegisterSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting fingerprint registration`);
      const { fingerprint, metadata } = req.body;
      const ip = getClientIp(req);
      const result = await createFingerprint({ fingerprint, ip, metadata });
      console.log(`${LOG_PREFIX} Successfully created fingerprint`);
      return sendSuccess(res, result, "Fingerprint registered successfully", 201);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error registering fingerprint:`, error);

      return sendError(
        res,
        ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_FINGERPRINT),
      );
    }
  },
];

export const get = [
  validateRequest(FingerprintParamsSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting fingerprint retrieval`);
      const fingerprintId = req.params.fingerprintId;
      const result = await getFingerprintAndUpdateIp({ fingerprintId, ip: getClientIp(req) });
      console.log(`${LOG_PREFIX} Successfully retrieved fingerprint`);
      return sendSuccess(res, result.data);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error retrieving fingerprint:`, error);

      return sendError(
        res,
        ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_FINGERPRINT),
      );
    }
  },
];

export const update = [
  validateRequest(FingerprintUpdateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`${LOG_PREFIX} Starting fingerprint update`);
      const { fingerprintId, metadata } = req.body;
      const result = await updateFingerprintMetadata({ fingerprintId, metadata });
      console.log(`${LOG_PREFIX} Successfully updated fingerprint`);
      return sendSuccess(res, result, "Fingerprint updated successfully");
    } catch (error) {
      console.error(`${LOG_PREFIX} Error updating fingerprint:`, error);
      return sendError(
        res,
        ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_FINGERPRINT),
      );
    }
  },
];
