import { Request, Response } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { PREDEFINED_ROLES } from "../constants/roles";
import { updateTags, updateRolesByTags } from "../services/tagService";
import { sendSuccess, sendError } from "../utils/response";

const tagSchema = z
  .array(z.string(), {
    required_error: "Tags array is required",
    invalid_type_error: "Tags must be an array of strings",
  })
  .min(1, "At least one tag must be provided");

const tagRuleSchema = z.record(
  z.object({
    tags: z
      .array(z.string(), {
        required_error: "Tag rule tags array is required",
        invalid_type_error: "Tag rule tags must be an array of strings",
      })
      .min(1, "At least one tag must be provided in rule"),
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
 * Add or update tags for a fingerprint
 */
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
      const result = await updateTags(fingerprintId, tags);
      return sendSuccess(res, result);
    } catch (error) {
      console.error("Error updating tags:", error);
      return sendError(res, error instanceof Error ? error : "Failed to update tags");
    }
  },
];

/**
 * Update roles based on tag rules
 */
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

      const result = await updateRolesByTags(fingerprintId, callerFingerprintId, tagRules);
      return sendSuccess(res, result);
    } catch (error) {
      console.error("Error updating roles based on tags:", error);
      return sendError(
        res,
        error instanceof Error ? error : "Failed to update roles based on tags",
      );
    }
  },
];
