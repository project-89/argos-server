import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { PREDEFINED_ROLES } from "../constants/roles";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";

export const assignRole = [
  validateRequest(
    z.object({
      fingerprintId: z
        .string({
          required_error: "Fingerprint ID is required",
        })
        .min(1, "Fingerprint ID cannot be empty"),
      role: z.enum(PREDEFINED_ROLES, {
        required_error: "Role is required",
        invalid_type_error: "Invalid role",
      }),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, role } = req.body;

      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
      }

      const data = fingerprintDoc.data();
      const currentRoles = new Set(data?.roles || ["user"]);
      currentRoles.add(role);

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
      console.error("Error assigning role:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];

export const removeRole = [
  validateRequest(
    z.object({
      fingerprintId: z
        .string({
          required_error: "Fingerprint ID is required",
        })
        .min(1, "Fingerprint ID cannot be empty"),
      role: z.enum(PREDEFINED_ROLES, {
        required_error: "Role is required",
        invalid_type_error: "Invalid role",
      }),
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, role } = req.body;

      if (role === "user") {
        return res.status(400).json({
          success: false,
          error: "Cannot remove user role",
        });
      }

      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
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
      console.error("Error removing role:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];

export const getAvailableRoles = async (_req: Request, res: Response): Promise<Response> => {
  try {
    return res.status(200).json({
      success: true,
      data: PREDEFINED_ROLES,
    });
  } catch (error) {
    console.error("Error getting available roles:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
