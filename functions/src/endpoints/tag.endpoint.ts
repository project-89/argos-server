import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { PREDEFINED_ROLES, PredefinedRole } from "../constants/roles";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";

type TagRule = {
  min: number;
  role: PredefinedRole;
};

type TagRules = Record<string, TagRule>;

const tagSchema = z.record(z.string(), z.number(), {
  required_error: "Tags object is required",
  invalid_type_error: "Tags must be an object with string keys and number values",
});

const tagRuleSchema = z.record(
  z.string(),
  z.object({
    min: z.number({
      required_error: "Min value is required",
      invalid_type_error: "Min value must be a number",
    }),
    role: z.enum(PREDEFINED_ROLES, {
      required_error: "Role is required",
      invalid_type_error: "Invalid role value",
    }),
  }),
  {
    required_error: "Tag rules object is required",
    invalid_type_error: "Tag rules must be an object",
  },
);

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

      // Get fingerprint document
      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      // Check if fingerprint exists
      if (!fingerprintDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
      }

      // Merge with existing tags
      const existingTags = fingerprintDoc.data()?.tags || {};
      const updatedTags = { ...existingTags, ...tags };

      // Update fingerprint document
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
      const { fingerprintId, tagRules } = req.body as { fingerprintId: string; tagRules: TagRules };

      // Get fingerprint document
      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      // Check if fingerprint exists
      if (!fingerprintDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
      }

      const data = fingerprintDoc.data();
      const currentTags = data?.tags || {};
      const currentRoles = new Set(data?.roles || ["user"]);

      // Always ensure user role is present
      currentRoles.add("user");

      // First preserve existing roles
      if (data?.roles) {
        for (const role of data.roles) {
          currentRoles.add(role);
        }
      }

      // Then add new roles based on tag rules
      for (const [tag, rule] of Object.entries(tagRules)) {
        const tagValue = currentTags[tag] || 0;
        if (tagValue >= rule.min) {
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
      console.error("Error updating roles based on tags:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
];
