import { Request, Response, NextFunction } from "express";
import { ROLE, ERROR_MESSAGES } from "../constants";
import { assignRole, removeRole, getAvailableRoles as getAvailableRolesService } from "../services";
import { sendError, sendSuccess, ApiError } from "../utils";

export const handleAssignRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId, role } = req.body;
    const callerFingerprintId = req.fingerprintId as string;

    const result = await assignRole(fingerprintId, callerFingerprintId, role as ROLE);
    return sendSuccess(res, result);
  } catch (error) {
    console.error("Error assigning role:", error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_ASSIGN_ROLE));
  }
};

export const handleRemoveRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fingerprintId, role } = req.body;
    const callerFingerprintId = req.fingerprintId as string;

    const result = await removeRole(fingerprintId, callerFingerprintId, role as ROLE);
    return sendSuccess(res, result);
  } catch (error) {
    console.error("Error removing role:", error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_REMOVE_ROLE));
  }
};

export const handleGetAvailableRoles = async (_req: Request, res: Response) => {
  try {
    return sendSuccess(res, getAvailableRolesService());
  } catch (error) {
    console.error("Error getting available roles:", error);
    return sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_AVAILABLE_ROLES));
  }
};
