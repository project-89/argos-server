import { z } from "zod";
import { ERROR_MESSAGES } from "../constants";

export const CreateImpressionSchema = z.object({
  body: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
    }),
    type: z.string(),
    data: z.record(z.any()),
    source: z.string().optional(),
    sessionId: z.string().optional(),
  }),
});

export const GetImpressionsSchema = z.object({
  params: z.object({
    fingerprintId: z.string(),
  }),
  query: z.object({
    type: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sessionId: z.string().optional(),
  }),
});

export const DeleteImpressionsSchema = z.object({
  params: z.object({
    fingerprintId: z.string(),
  }),
  query: z.object({
    type: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    sessionId: z.string().optional(),
  }),
});
