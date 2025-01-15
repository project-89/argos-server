import { z } from "zod";
import { ROLE } from "../constants/roles";
import { ERROR_MESSAGES } from "../constants/api";

// Common sub-schemas
const tagsSchema = z.record(z.number());

// Request schemas
export const schemas = {
  // Fingerprint schemas
  fingerprintRegister: z.object({
    fingerprint: z.string({
      required_error: "Fingerprint is required",
      invalid_type_error: "Fingerprint must be a string",
    }),
    metadata: z.record(z.any()).optional(),
  }),

  fingerprintUpdate: z
    .object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      }),
      metadata: z.record(z.any()).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.fingerprintId && !data.metadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_type,
          expected: "object",
          received: "undefined",
          path: ["metadata"],
          message: "Metadata is required",
        });
      }
    }),

  // Visit schemas
  visitLog: z.object({
    fingerprintId: z.string({
      required_error: "Fingerprint is required",
      invalid_type_error: "Fingerprint must be a string",
    }),
    url: z.string().url(),
    title: z.string().optional(),
  }),

  updatePresence: z.object({
    fingerprintId: z.string({
      required_error: "Fingerprint is required",
      invalid_type_error: "Fingerprint must be a string",
    }),
    status: z.string(),
  }),

  removeSite: z.object({
    fingerprintId: z.string({
      required_error: "Fingerprint is required",
      invalid_type_error: "Fingerprint must be a string",
    }),
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
    fingerprintId: z.string({
      required_error: "Fingerprint is required",
      invalid_type_error: "Fingerprint must be a string",
    }),
  }),

  apiKeyValidate: z.object({
    key: z.string({
      required_error: "API key is required",
      invalid_type_error: "API key must be a string",
    }),
  }),

  apiKeyRevoke: z.object({
    key: z.string({
      required_error: "API key is required",
      invalid_type_error: "API key must be a string",
    }),
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
