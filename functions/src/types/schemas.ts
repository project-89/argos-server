import { z } from "zod";
import { ROLE } from "../constants/roles";

// Common sub-schemas
const tagsSchema = z.record(z.number());

// Request schemas
export const schemas = {
  // Fingerprint schemas
  fingerprintRegister: z.object({
    fingerprint: z.string(),
    metadata: z.record(z.any()).optional(),
  }),

  fingerprintUpdate: z.object({
    metadata: z.record(z.any()),
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

  // ROLE schemas
  roleAssign: z.object({
    fingerprintId: z.string(),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]),
  }),

  roleRemove: z.object({
    fingerprintId: z.string(),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]),
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
        role: z.enum(Object.values(ROLE) as [string, ...string[]]),
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

  // Impression schemas
  createImpressionSchema: z.object({
    fingerprintId: z.string(),
    type: z.string(),
    data: z.record(z.any()),
    source: z.string().optional(),
    sessionId: z.string().optional(),
  }),

  getImpressionsSchema: z.object({
    fingerprintId: z.string(),
    type: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    limit: z.number().int().positive().optional(),
    sessionId: z.string().optional(),
  }),

  deleteImpressionsSchema: z.object({
    fingerprintId: z.string(),
    type: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    sessionId: z.string().optional(),
  }),
};
