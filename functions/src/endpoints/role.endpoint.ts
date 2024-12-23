import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { PREDEFINED_ROLES } from "../constants/roles";
import {
  assignRole as assignRoleService,
  removeRole as removeRoleService,
  getAvailableRoles as getAvailableRolesService,
} from "../services/roleService";
import { sendSuccess, sendError } from "../utils/response";

const roleSchema = z.object({
  fingerprintId: z
    .string({
      required_error: "Fingerprint ID is required",
    })
    .min(1, "Fingerprint ID cannot be empty"),
  role: z.enum(PREDEFINED_ROLES, {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

export const assignRole = [
  validateRequest(roleSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, role } = roleSchema.parse(req.body);
      const callerFingerprintId = req.fingerprintId as string;

      const result = await assignRoleService(fingerprintId, callerFingerprintId, role);
      return sendSuccess(res, result);
    } catch (error) {
      console.error("Error assigning role:", error);
      return sendError(res, error instanceof Error ? error : "Failed to assign role");
    }
  },
];

export const removeRole = [
  validateRequest(roleSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, role } = roleSchema.parse(req.body);
      const callerFingerprintId = req.fingerprintId as string;

      const result = await removeRoleService(fingerprintId, callerFingerprintId, role);
      return sendSuccess(res, result);
    } catch (error) {
      console.error("Error removing role:", error);
      return sendError(res, error instanceof Error ? error : "Failed to remove role");
    }
  },
];

export const getAvailableRoles = async (_req: Request, res: Response): Promise<Response> => {
  return sendSuccess(res, getAvailableRolesService());
};
