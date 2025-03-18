import { z } from "zod";
import { ERROR_MESSAGES } from "../constants";

// Domain Models
export const IpMetadataSchema = z.object({
  primaryIp: z.string().optional(),
  ipFrequency: z.record(z.number()),
  lastSeenAt: z.record(z.number()),
  suspiciousIps: z.array(z.string()),
});

export const FingerprintSchema = z.object({
  id: z.string(),
  fingerprint: z.string(),
  roles: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
  ipAddresses: z.array(z.string()),
  createdAt: z.number(),
  lastVisited: z.number(),
  ipMetadata: IpMetadataSchema,
  accountId: z.string().optional(), // Link to account when claimed
  anonUserId: z.string().optional(), // Single anon user link
});

// API Response Schemas
export const FingerprintResponseSchema = z.object({
  data: FingerprintSchema,
});

// Request/Response Validation Schemas
export const FingerprintRegisterSchema = z.object({
  body: z.object({
    fingerprint: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.FINGERPRINT_MUST_BE_STRING,
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
        invalid_type_error: ERROR_MESSAGES.FINGERPRINT_MUST_BE_STRING,
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
          message: ERROR_MESSAGES.MISSING_METADATA,
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
      invalid_type_error: ERROR_MESSAGES.FINGERPRINT_MUST_BE_STRING,
    }),
  }),
});

// Type Exports
export type Fingerprint = z.infer<typeof FingerprintSchema>;
export type IpMetadata = z.infer<typeof IpMetadataSchema>;
export type FingerprintResponse = z.infer<typeof FingerprintResponseSchema>;
export type FingerprintRegisterRequest = z.infer<typeof FingerprintRegisterSchema>;
export type FingerprintUpdateRequest = z.infer<typeof FingerprintUpdateSchema>;
export type FingerprintParamsRequest = z.infer<typeof FingerprintParamsSchema>;
