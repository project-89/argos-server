import { z } from "zod";
import { ROLE } from "../constants/roles";
import { ERROR_MESSAGES } from "../constants/api";

// Common sub-schemas
const tagsSchema = z.record(z.number());

// Request schemas
export const schemas = {
  // Fingerprint schemas
  fingerprintRegister: z.object({
    body: z.object({
      fingerprint: z.string({
        required_error: "Fingerprint is required",
        invalid_type_error: "Fingerprint must be a string",
      }),
      metadata: z.record(z.any()).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  fingerprintUpdate: z.object({
    body: z
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
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  // Visit schemas
  visitLog: z.object({
    body: z.object({
      fingerprintId: z.string({
        required_error: "Fingerprint is required",
        invalid_type_error: "Fingerprint must be a string",
      }),
      url: z.string().url(),
      title: z.string().optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  updatePresence: z.object({
    body: z.object({
      status: z.string(),
    }),
    query: z.object({}).optional(),
    params: z.object({
      fingerprintId: z.string({
        required_error: "Fingerprint is required",
        invalid_type_error: "Fingerprint must be a string",
      }),
    }),
  }),

  removeSite: z.object({
    body: z.object({
      fingerprintId: z.string({
        required_error: "Fingerprint is required",
        invalid_type_error: "Fingerprint must be a string",
      }),
      siteId: z.string(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  // ROLE schemas
  roleAssign: z.object({
    body: z.object({
      fingerprintId: z.string(),
      role: z.enum(Object.values(ROLE) as [string, ...string[]]),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  roleRemove: z.object({
    body: z.object({
      fingerprintId: z.string(),
      role: z.enum(Object.values(ROLE) as [string, ...string[]]),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  // Tag schemas
  addOrUpdateTags: z.object({
    body: z.object({
      fingerprintId: z.string(),
      tags: tagsSchema,
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  updateRolesBasedOnTags: z.object({
    body: z.object({
      fingerprintId: z.string(),
      tagRules: z.record(
        z.object({
          min: z.number(),
          role: z.enum(Object.values(ROLE) as [string, ...string[]]),
        }),
      ),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  // API Key schemas
  apiKeyRegister: z.object({
    body: z.object({
      fingerprintId: z.string({
        required_error: "Fingerprint is required",
        invalid_type_error: "Fingerprint must be a string",
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  apiKeyValidate: z.object({
    body: z.object({
      key: z.string({
        required_error: "API key is required",
        invalid_type_error: "API key must be a string",
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
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

  impressionCreate: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
    }),
    type: z.string({
      required_error: ERROR_MESSAGES.REQUIRED_FIELD,
    }),
    data: z.record(z.any(), {
      required_error: ERROR_MESSAGES.MISSING_METADATA,
    }),
    source: z.string().optional(),
    sessionId: z.string().optional(),
  }),

  impressionDelete: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
    }),
    type: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    sessionId: z.string().optional(),
  }),

  // Presence schemas
  presenceUpdate: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      }),
    }),
    body: z
      .object({
        status: z.enum(["online", "offline", "away"]),
      })
      .strict(),
  }),

  presenceGet: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      }),
    }),
  }),

  presenceActivity: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      }),
    }),
  }),

  // Tag game schemas
  tagUser: z.object({
    body: z.object({
      targetFingerprintId: z.string({
        required_error: "Target fingerprint ID is required",
        invalid_type_error: "Target fingerprint ID must be a string",
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
} as const;
