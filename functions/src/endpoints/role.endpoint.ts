import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { ROLE } from "../constants/roles";
import {
  assignRole as assignRoleService,
  removeRole as removeRoleService,
  getAvailableRoles as getAvailableRolesService,
} from "../services/roleService";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";

const roleSchema = z.object({
  fingerprintId: z
    .string({
      required_error: "Fingerprint ID is required",
    })
    .min(1, "Fingerprint ID cannot be empty"),
  role: z.enum(Object.values(ROLE) as [string, ...string[]], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

export const assignRole = [
  validateRequest(roleSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fingerprintId, role } = roleSchema.parse(req.body);
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
  validateRequest(roleSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fingerprintId, role } = roleSchema.parse(req.body);
      const callerFingerprintId = req.fingerprintId as string;

      const result = await removeRoleService(fingerprintId, callerFingerprintId, role as ROLE);
      sendSuccess(res, result);
    } catch (error) {
      console.error("Error removing role:", error);
      next(error instanceof Error ? error : new ApiError(500, ERROR_MESSAGES.FAILED_REMOVE_ROLE));
    }
  },
];

export const getAvailableRoles = async (_req: Request, res: Response): Promise<Response> => {
  return sendSuccess(res, getAvailableRolesService());
};
