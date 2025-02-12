import { z } from "zod";
import { ERROR_MESSAGES } from "../constants";
import { TimestampSchema } from ".";

// Domain Models
export const PresenceDataSchema = z.object({
  status: z.enum(["online", "offline", "away"]),
  lastUpdated: TimestampSchema,
  createdAt: TimestampSchema,
});

export const PresenceResponseSchema = z.object({
  fingerprintId: z.string(),
  status: z.enum(["online", "offline", "away"]),
  lastUpdated: z.number(),
  createdAt: z.number(),
});

// Request/Response Validation Schemas
export const PresenceUpdateSchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({
    status: z.enum(["online", "offline", "away"], {
      required_error: ERROR_MESSAGES.MISSING_STATUS,
      invalid_type_error: ERROR_MESSAGES.INVALID_STATUS,
    }),
  }),
  query: z.object({}).optional(),
});

export const PresenceGetSchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const PresenceActivitySchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

// Type Exports
export type PresenceData = z.infer<typeof PresenceDataSchema>;
export type PresenceResponse = z.infer<typeof PresenceResponseSchema>;
export type PresenceUpdateRequest = z.infer<typeof PresenceUpdateSchema>;
export type PresenceGetRequest = z.infer<typeof PresenceGetSchema>;
export type PresenceActivityRequest = z.infer<typeof PresenceActivitySchema>;
