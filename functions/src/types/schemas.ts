import { z } from "zod";
import { ROLES } from "../constants";

// Common sub-schemas
const tagsSchema = z.record(z.number());

// Request schemas
export const schemas = {
  // Fingerprint schemas
  fingerprintRegister: z.object({
    fingerprint: z.string({
      required_error: "Fingerprint is required",
    }),
    metadata: z.record(z.any()).optional(),
  }),

  fingerprintUpdate: z.object({
    metadata: z.record(z.any(), {
      required_error: "Metadata is required",
      invalid_type_error: "Metadata must be an object",
    }),
  }),

  // Visit schemas
  visitLog: z.object({
    fingerprintId: z.string(),
    url: z.string().url(),
    title: z.string().optional(),
  }),

  updatePresence: z.object({
    fingerprintId: z.string(),
    status: z.string(),
  }),

  removeSite: z.object({
    fingerprintId: z.string(),
    siteId: z.string(),
  }),

  // Role schemas
  roleAssign: z.object({
    fingerprintId: z.string(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
  }),

  roleRemove: z.object({
    fingerprintId: z.string(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
  }),

  // Tag schemas
  addOrUpdateTags: z.object({
    fingerprintId: z.string(),
    tags: tagsSchema,
  }),

  updateRolesBasedOnTags: z.object({
    fingerprintId: z.string(),
    tagRules: z.record(
      z.object({
        min: z.number(),
        role: z.enum(Object.values(ROLES) as [string, ...string[]]),
      }),
    ),
  }),

  // API Key schemas
  apiKeyRegister: z.object({
    fingerprintId: z.string(),
  }),

  apiKeyValidate: z.object({
    key: z.string(),
  }),

  apiKeyRevoke: z.object({
    key: z.string(),
  }),
};
