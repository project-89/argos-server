import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { PREDEFINED_ROLES, ROLE_HIERARCHY, PredefinedRole } from "../constants/roles";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { ApiError } from "../utils/error";

const tagSchema = z
  .array(z.any(), {
    required_error: "Tags array is required",
    invalid_type_error: "Tags must be an array of strings",
  })
  .min(1, "At least one tag must be provided")
  .refine((arr) => arr.every((item) => typeof item === "string"), {
    message: "Tags must be an array of strings",
  });

const tagRuleSchema = z.record(
  z.object({
    tags: z
      .array(z.any(), {
        required_error: "Tag rule tags array is required",
        invalid_type_error: "Tag rule tags must be an array of strings",
      })
      .min(1, "At least one tag must be provided in rule")
      .refine((arr) => arr.every((item) => typeof item === "string"), {
        message: "Tag rule tags must be an array of strings",
      }),
    role: z.enum(PREDEFINED_ROLES, {
      required_error: "Role is required",
      invalid_type_error: "Invalid role",
    }),
  }),
  {
    required_error: "Tag rules object is required",
    invalid_type_error: "Tag rules must be an object",
  },
);

type TagRuleType = z.infer<typeof tagRuleSchema>;

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

export const addOrUpdateTags = [
  validateRequest(
    z.object({
      fingerprintId: z
        .string({
          required_error: "Fingerprint ID is required",
        })
        .min(1, "Fingerprint ID cannot be empty"),
      tags: tagSchema,
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, tags } = req.body;

      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const data = fingerprintDoc.data();
      const currentTags = new Set(data?.tags || []);

      // Add new tags to the set
      tags.forEach((tag: string) => currentTags.add(tag));

      // Convert set back to array
      const updatedTags = Array.from(currentTags);

      await fingerprintRef.update({
        tags: updatedTags,
      });

      return res.status(200).json({
        success: true,
        data: {
          fingerprintId,
          tags: updatedTags,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({
          success: false,
          error: firstError.message,
        });
      }
      console.error("Error updating tags:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];

export const updateRolesBasedOnTags = [
  validateRequest(
    z.object({
      fingerprintId: z
        .string({
          required_error: "Fingerprint ID is required",
        })
        .min(1, "Fingerprint ID cannot be empty"),
      tagRules: tagRuleSchema,
    }),
  ),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId, tagRules } = req.body as {
        fingerprintId: string;
        tagRules: TagRuleType;
      };
      const callerFingerprintId = req.fingerprintId as string;

      // Prevent self-role modification
      if (fingerprintId === callerFingerprintId) {
        throw new ApiError(403, "Cannot modify your own roles");
      }

      // Check if caller has sufficient privileges for all roles in the rules
      for (const [_, rule] of Object.entries(tagRules)) {
        const hasPermission = await canManageRole(callerFingerprintId, rule.role);
        if (!hasPermission) {
          throw new ApiError(403, `Insufficient privileges to assign role: ${rule.role}`);
        }
      }

      // Get fingerprint document
      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      // Check if fingerprint exists
      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const data = fingerprintDoc.data();
      const currentTags = new Set(data?.tags || []);
      const currentRoles = new Set(data?.roles || ["user"]);

      // Always ensure user role is present
      currentRoles.add("user");

      // Then add new roles based on tag rules
      for (const [_, rule] of Object.entries(tagRules)) {
        // Check if fingerprint has all required tags
        if (rule.tags.every((tag) => currentTags.has(tag))) {
          currentRoles.add(rule.role);
        }
      }

      // Update fingerprint document
      const updatedRoles = Array.from(currentRoles);
      await fingerprintRef.update({
        roles: updatedRoles,
      });

      return res.status(200).json({
        success: true,
        data: {
          fingerprintId,
          roles: updatedRoles,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({
          success: false,
          error: firstError.message,
        });
      }
      console.error("Error updating roles based on tags:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];
