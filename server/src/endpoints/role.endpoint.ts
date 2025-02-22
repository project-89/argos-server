import { Response } from "express";
import { AccountRole, ERROR_MESSAGES } from "../constants";
import { assignRole, removeRole, getAvailableRoles } from "../services";
import { sendError, sendSuccess, ApiError } from "../utils";

const LOG_PREFIX = "[Role Endpoint]";

export const handleAssignRole = async (req: Express.Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Starting role assignment`, {
      targetFingerprint: req.body.fingerprintId,
      role: req.body.role,
      caller: req.auth?.fingerprint.id,
    });

    const { fingerprintId, role } = req.body;
    const callerFingerprintId = req.auth?.fingerprint.id;

    if (!callerFingerprintId) {
      return sendError(res, new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED));
    }

    const result = await assignRole(fingerprintId, callerFingerprintId, role as AccountRole);

    console.log(`${LOG_PREFIX} Successfully assigned role`, {
      targetFingerprint: fingerprintId,
      role,
      caller: callerFingerprintId,
    });
    return sendSuccess(res, result, "Role assigned successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error assigning role:`, error, {
      targetFingerprint: req.body.fingerprintId,
      role: req.body.role,
      caller: req.auth?.fingerprint.id,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_ASSIGN_ROLE));
  }
};

export const handleRemoveRole = async (req: Express.Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Starting role removal`, {
      targetFingerprint: req.body.fingerprintId,
      role: req.body.role,
      caller: req.auth?.fingerprint.id,
    });

    const { fingerprintId, role } = req.body;
    const callerFingerprintId = req.auth?.fingerprint.id;

    if (!callerFingerprintId) {
      return sendError(res, new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED));
    }

    const result = await removeRole(fingerprintId, callerFingerprintId, role as AccountRole);

    console.log(`${LOG_PREFIX} Successfully removed role`, {
      targetFingerprint: fingerprintId,
      role,
      caller: callerFingerprintId,
    });
    return sendSuccess(res, result, "Role removed successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error removing role:`, error, {
      targetFingerprint: req.body.fingerprintId,
      role: req.body.role,
      caller: req.auth?.fingerprint.id,
    });
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_REMOVE_ROLE));
  }
};

export const handleGetAvailableRoles = async (_req: Express.Request, res: Response) => {
  try {
    console.log(`${LOG_PREFIX} Getting available roles`);
    const roles = getAvailableRoles();
    console.log(`${LOG_PREFIX} Successfully retrieved available roles`);
    return sendSuccess(res, roles);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting available roles:`, error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_AVAILABLE_ROLES));
  }
};
