import { z } from "zod";
import { ERROR_MESSAGES } from "../constants/api";

export const VisitLogSchema = z.object({
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
});

export const VisitPresenceSchema = z.object({
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
});

export const VisitRemoveSiteSchema = z.object({
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
});

export const VisitHistorySchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
