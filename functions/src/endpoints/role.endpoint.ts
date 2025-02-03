import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { ROLE } from "../constants/roles.constants";
import {
  assignRole as assignRoleService,
  removeRole as removeRoleService,
  getAvailableRoles as getAvailableRolesService,
} from "../services/role.service";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api.constants";
import { AssignRoleSchema, RemoveRoleSchema } from "@/schemas";

export const assignRole = [
  validateRequest(AssignRoleSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fingerprintId, role } = req.body;
      const callerFingerprintId = req.fingerprintId as string;

      const result = await assignRoleService(fingerprintId, callerFingerprintId, role as ROLE);
      sendSuccess(res, result);
    } catch (error) {
      console.error("Error assigning role:", error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_ASSIGN_ROLE));
    }
  },
];

export const removeRole = [
  validateRequest(RemoveRoleSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fingerprintId, role } = req.body;
      const callerFingerprintId = req.fingerprintId as string;

      const result = await removeRoleService(fingerprintId, callerFingerprintId, role as ROLE);
      sendSuccess(res, result);
    } catch (error) {
      console.error("Error removing role:", error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_REMOVE_ROLE));
    }
  },
];

export const getAvailableRoles = [
  async (_req: Request, res: Response): Promise<Response> => {
    return sendSuccess(res, getAvailableRolesService());
  },
];
