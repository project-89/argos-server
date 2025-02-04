import { z } from "zod";
import { ERROR_MESSAGES } from "../constants/api.constants";

export const FingerprintRegisterSchema = z.object({
  body: z.object({
    fingerprint: z.string({
      required_error: "Fingerprint is required",
      invalid_type_error: "Fingerprint must be a string",
    }),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const FingerprintUpdateSchema = z.object({
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
});

export const FingerprintParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
    }),
  }),
});
