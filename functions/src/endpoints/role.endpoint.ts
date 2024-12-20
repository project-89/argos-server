import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { PREDEFINED_ROLES, ROLE_HIERARCHY, PredefinedRole } from "../constants/roles";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { ApiError } from "../utils/error";

/**
 * Check if the caller has sufficient privileges to manage the target role
 */
const canManageRole = async (
  callerFingerprintId: string,
  targetRole: PredefinedRole,
): Promise<boolean> => {
  const db = getFirestore();
  const callerDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(callerFingerprintId).get();

  if (!callerDoc.exists) {
    return false;
  }

  const callerData = callerDoc.data();
  const callerRoles = callerData?.roles || ["user"];

  // Admin can manage any role
  if (callerRoles.includes("admin")) {
    return true;
  }

  // Get the highest role level of the caller
  const callerLevel = Math.max(
    ...callerRoles.map((role: string) => ROLE_HIERARCHY[role as PredefinedRole] || 0),
  );
  const targetLevel = ROLE_HIERARCHY[targetRole];

  // Caller must have a higher role level to manage the target role
  return callerLevel > targetLevel;
};

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

      // Get caller's roles to check if they're an admin
      const db = getFirestore();
      const callerDoc = await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(callerFingerprintId)
        .get();
      const callerData = callerDoc.data();
      const isAdmin = callerData?.roles?.includes("admin") || false;

      // Only prevent self-role modification for non-admins
      if (fingerprintId === callerFingerprintId && !isAdmin) {
        throw new ApiError(403, "Cannot modify your own roles");
      }

      // Check if caller has sufficient privileges
      const hasPermission = await canManageRole(callerFingerprintId, role);
      if (!hasPermission) {
        throw new ApiError(403, "Insufficient privileges to assign this role");
      }

      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const data = fingerprintDoc.data();
      const currentRoles = new Set(data?.roles || ["user"]);
      currentRoles.add(role);
      currentRoles.add("user"); // Ensure user role is always present

      await fingerprintRef.update({
        roles: Array.from(currentRoles),
      });

      return res.status(200).json({
        success: true,
        data: {
          fingerprintId,
          roles: Array.from(currentRoles),
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error("Error assigning role:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];

export const removeRole = [
  validateRequest(roleSchema),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, role } = roleSchema.parse(req.body);
      const callerFingerprintId = req.fingerprintId as string;

      if (role === "user") {
        throw new ApiError(400, "Cannot remove user role");
      }

      // Get caller's roles to check if they're an admin
      const db = getFirestore();
      const callerDoc = await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc(callerFingerprintId)
        .get();
      const callerData = callerDoc.data();
      const isAdmin = callerData?.roles?.includes("admin") || false;

      // Only prevent self-role modification for non-admins
      if (fingerprintId === callerFingerprintId && !isAdmin) {
        throw new ApiError(403, "Cannot modify your own roles");
      }

      // Check if caller has sufficient privileges
      const hasPermission = await canManageRole(callerFingerprintId, role);
      if (!hasPermission) {
        throw new ApiError(403, "Insufficient privileges to remove this role");
      }

      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const data = fingerprintDoc.data();
      const currentRoles = new Set(data?.roles || ["user"]);
      currentRoles.delete(role);
      currentRoles.add("user"); // Ensure user role is always present

      await fingerprintRef.update({
        roles: Array.from(currentRoles),
      });

      return res.status(200).json({
        success: true,
        data: {
          fingerprintId,
          roles: Array.from(currentRoles),
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error("Error removing role:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];

export const getAvailableRoles = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    success: true,
    data: PREDEFINED_ROLES,
  });
};
