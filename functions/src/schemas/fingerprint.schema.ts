import { z } from "zod";
import { TimestampSchema } from "./common.schemas";
import { ERROR_MESSAGES } from "../constants";
import { TagDataSchema } from "./tag.schema";

// Domain Models
export const IpMetadataSchema = z.object({
  primaryIp: z.string().optional(),
  ipFrequency: z.record(z.number()),
  lastSeenAt: z.record(TimestampSchema),
  suspiciousIps: z.array(z.string()),
});

export const TagLimitsSchema = z.object({
  firstTaggedAt: TimestampSchema,
  remainingDailyTags: z.number(),
  lastTagResetAt: TimestampSchema,
});

export const FingerprintSchema = z.object({
  id: z.string(),
  fingerprint: z.string(),
  roles: z.array(z.string()),
  tags: z.array(TagDataSchema).optional(),
  tagLimits: TagLimitsSchema.optional(),
  metadata: z.record(z.any()),
  ipAddresses: z.array(z.string()),
  createdAt: TimestampSchema,
  lastVisited: TimestampSchema,
  ipMetadata: IpMetadataSchema,
});

export const SocialIdentifierSchema = z.object({
  platform: z.enum(["x", "discord"]),
  username: z.string(),
  profileUrl: z.string().optional(),
  discoveredFrom: z.array(
    z.object({
      action: z.enum(["tagging", "being_tagged", "mentioned"]),
      relatedUsername: z.string(),
      timestamp: TimestampSchema,
    }),
  ),
});

export const TransitoryTagLimitsSchema = z.object({
  firstTaggedAt: TimestampSchema,
  remainingDailyTags: z.number(),
  lastTagResetAt: TimestampSchema,
});

export const TransitoryFingerprintSchema = z.object({
  id: z.string(),
  socialIdentifier: SocialIdentifierSchema,
  status: z.enum(["pending", "claimed"]),
  tags: z.array(TagDataSchema),
  createdAt: TimestampSchema,
  claimedAt: TimestampSchema.optional(),
  linkedFingerprintId: z.string().optional(),
  tagLimits: TransitoryTagLimitsSchema.optional(),
});

// Request/Response Validation Schemas
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

// Type Exports
export type Fingerprint = z.infer<typeof FingerprintSchema>;
export type IpMetadata = z.infer<typeof IpMetadataSchema>;
export type SocialIdentifier = z.infer<typeof SocialIdentifierSchema>;
export type TransitoryTagLimits = z.infer<typeof TransitoryTagLimitsSchema>;
export type TransitoryFingerprint = z.infer<typeof TransitoryFingerprintSchema>;
export type FingerprintRegisterRequest = z.infer<typeof FingerprintRegisterSchema>;
export type FingerprintUpdateRequest = z.infer<typeof FingerprintUpdateSchema>;
export type FingerprintParamsRequest = z.infer<typeof FingerprintParamsSchema>;
