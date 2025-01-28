import { z } from "zod";
import { ROLE } from "../constants/roles";
import { ERROR_MESSAGES } from "../constants/api";

// Common sub-schemas
const tagsSchema = z.record(z.number());

// Profile schemas
const contactInfoSchema = z.object({
  email: z.string().email().optional(),
  discord: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
});

const preferencesSchema = z.object({
  isProfilePublic: z.boolean().optional(),
  showContactInfo: z.boolean().optional(),
  showStats: z.boolean().optional(),
});

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
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
      url: z
        .string({
          required_error: ERROR_MESSAGES.MISSING_URL,
          invalid_type_error: ERROR_MESSAGES.INVALID_URL,
        })
        .url(ERROR_MESSAGES.INVALID_URL),
      title: z.string().optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  visitPresence: z.object({
    body: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
      status: z.enum(["online", "offline"] as const, {
        invalid_type_error: ERROR_MESSAGES.INVALID_STATUS,
        required_error: ERROR_MESSAGES.MISSING_STATUS,
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  visitRemoveSite: z.object({
    body: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
      siteId: z.string({
        required_error: ERROR_MESSAGES.SITE_NOT_FOUND,
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  visitHistory: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
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
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  apiKeyValidate: z.object({
    body: z.object({
      key: z.string({
        required_error: ERROR_MESSAGES.MISSING_API_KEY,
        invalid_type_error: "API key must be a string",
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  apiKeyRevoke: z.object({
    body: z.object({
      key: z.string({
        required_error: ERROR_MESSAGES.MISSING_API_KEY,
        invalid_type_error: "API key must be a string",
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
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
    body: z.object({
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
    query: z.object({}).optional(),
    params: z.object({}).optional(),
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

  impressionGet: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
    }),
    query: z
      .object({
        type: z.string().optional(),
      })
      .optional(),
    body: z.object({}).optional(),
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

  // Tag leaderboard schemas
  getTagLeaderboard: z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: z.object({
      timeframe: z
        .enum(["daily", "weekly", "monthly", "allTime"], {
          invalid_type_error: "Invalid timeframe",
        })
        .optional()
        .default("allTime"),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(z.number().int().min(1).max(100).optional()),
      offset: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(z.number().int().min(0).optional()),
      fingerprintId: z.string().optional(),
    }),
  }),

  fingerprintParams: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
  }),

  checkTag: z.object({
    params: z.object({
      fingerprintId: z.string({
        required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
        invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
      }),
      tagType: z.string({
        required_error: "Tag type is required",
        invalid_type_error: "Tag type must be a string",
      }),
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
  }),

  profileCreate: z.object({
    body: z.object({
      walletAddress: z.string(),
      username: z.string().min(3).max(30),
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      contactInfo: contactInfoSchema.optional(),
      preferences: preferencesSchema.optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),

  profileGet: z.object({
    params: z.object({
      id: z.string(),
    }),
    query: z.object({}).optional(),
    body: z.object({}).optional(),
  }),

  profileGetByWallet: z.object({
    params: z.object({
      walletAddress: z.string(),
    }),
    query: z.object({}).optional(),
    body: z.object({}).optional(),
  }),

  profileUpdate: z.object({
    params: z.object({
      id: z.string(),
    }),
    body: z.object({
      username: z.string().min(3).max(30).optional(),
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      contactInfo: contactInfoSchema.optional(),
      preferences: preferencesSchema.optional(),
    }),
    query: z.object({}).optional(),
  }),
} as const;
