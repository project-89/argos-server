import { z } from "zod";

import { TagDataSchema, TagLimitDataSchema, TimestampSchema } from ".";

// Base schemas
export const SocialPlatformSchema = z.literal("x");

export const HashedSocialIdentitySchema = z.object({
  platform: SocialPlatformSchema,
  hash: z.string(),
  salt: z.string(),
  lastSeen: TimestampSchema.optional(),
});

export const DiscoverySourceSchema = z.object({
  type: z.enum(["tagging", "being_tagged", "onboarding_verification"]),
  timestamp: TimestampSchema,
  relatedHash: z.string().optional(),
});

export const AnonSocialUserSchema = z.object({
  id: z.string(),
  identities: z.array(HashedSocialIdentitySchema),
  status: z.enum(["active", "inactive", "verified", "claimed", "banned"]),
  tags: z.array(TagDataSchema),
  linkedFingerprintId: z.string().optional(),
  linkedAccountId: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  claimedAt: TimestampSchema.optional(),
  tagLimits: TagLimitDataSchema.optional(),
  discoverySource: DiscoverySourceSchema,
  metadata: z.record(z.any()).optional(),
});

// Internal function parameter schemas
export const DiscoveryInfoSchema = z.object({
  action: z.enum(["tagging", "being_tagged", "onboarding_verification"]),
  relatedUsername: z.string(),
  timestamp: TimestampSchema,
});

export const CreateAnonSocialUserParamsSchema = z.object({
  platform: SocialPlatformSchema,
  hash: z.string(),
  salt: z.string(),
  discoveryInfo: DiscoveryInfoSchema,
  initialTagLimits: z.boolean().optional(),
});

export const UpdateDiscoveryParamsSchema = z.object({
  docRef: z.custom<FirebaseFirestore.DocumentReference>(),
  discoveryInfo: DiscoveryInfoSchema,
  platform: SocialPlatformSchema,
});

export const UpdateStatusParamsSchema = z.object({
  userId: z.string(),
  status: z.enum(["active", "inactive", "verified", "claimed", "banned"]),
  metadata: z.record(z.any()).optional(),
});

export const LinkParamsSchema = z.object({
  userId: z.string(),
  linkedId: z.string(),
});

export const FindAnonUserParamsSchema = z.object({
  hash: z.string(),
});

export const FindOrCreateAnonUserParamsSchema = z.object({
  username: z.string(),
  platform: SocialPlatformSchema,
  discoveryInfo: DiscoveryInfoSchema,
  initialTagLimits: z.boolean().optional(),
});

// Export inferred types
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;
export type HashedSocialIdentity = z.infer<typeof HashedSocialIdentitySchema>;
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;
export type AnonSocialUser = z.infer<typeof AnonSocialUserSchema>;

// Internal function parameter types
export type DiscoveryInfo = z.infer<typeof DiscoveryInfoSchema>;
export type CreateAnonSocialUserParams = z.infer<typeof CreateAnonSocialUserParamsSchema>;
export type UpdateDiscoveryParams = z.infer<typeof UpdateDiscoveryParamsSchema>;
export type UpdateStatusParams = z.infer<typeof UpdateStatusParamsSchema>;
export type LinkParams = z.infer<typeof LinkParamsSchema>;
export type FindAnonUserParams = z.infer<typeof FindAnonUserParamsSchema>;
export type FindOrCreateAnonUserParams = z.infer<typeof FindOrCreateAnonUserParamsSchema>;
