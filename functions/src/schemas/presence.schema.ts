import { z } from "zod";
import { ERROR_MESSAGES } from "../constants/api.constants";

export const PresenceUpdateSchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({
    status: z.string({
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
