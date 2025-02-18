import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { TagDataSchema, TagLimitDataSchema, TimestampSchema } from ".";

// Base schemas
export const SocialPlatformSchema = z.literal("x");

export const ActionSchema = z.enum(["tagging", "being_tagged", "onboarding_verification"]);
export const StatusSchema = z.enum(["active", "inactive", "verified", "claimed", "banned"]);

export const SocialIdentitySchema = z.object({
  platform: SocialPlatformSchema,
  hashedUsername: z.string(),
  usernameSalt: z.string(),
  lastSeen: TimestampSchema.optional(),
});

export const DiscoverySourceSchema = z.object({
  type: ActionSchema,
  createdAt: TimestampSchema,
  relatedHashedUsername: z.string().optional(),
});

export const AnonUserSchema = z.object({
  id: z.string(),
  identities: z.array(SocialIdentitySchema),
  status: StatusSchema,
  tags: z.array(TagDataSchema),
  fingerprintId: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  claimedAt: TimestampSchema.optional(),
  tagLimits: TagLimitDataSchema.optional(),
  discoverySource: DiscoverySourceSchema,
  metadata: z.record(z.any()).optional(),
});

// Pure function parameter schemas
export const DiscoveryInfoSchema = z.object({
  action: ActionSchema,
  relatedHashedUsername: z.string().optional(),
  createdAt: TimestampSchema,
});

export const CreateAnonUserDataSchema = z.object({
  platform: SocialPlatformSchema,
  hashedUsername: z.string(),
  usernameSalt: z.string(),
  discoveryInfo: DiscoveryInfoSchema,
  initialTagLimits: z.boolean(),
  now: z.instanceof(Timestamp),
});

export const CreateDiscoveryUpdateSchema = z.object({
  platform: SocialPlatformSchema,
  discoveryInfo: DiscoveryInfoSchema,
  now: z.instanceof(Timestamp),
});

// Database operation parameter schemas
export const FindAnonUserParamsSchema = z.object({
  hashedUsername: z.string(),
});

export const FindAnonUserByUsernameSchema = z.object({
  hashedUsername: z.string(),
  platform: SocialPlatformSchema,
});

export const CreateAnonUserSchema = z.object({
  hashedUsername: z.string(),
  platform: SocialPlatformSchema,
  discoveryInfo: DiscoveryInfoSchema,
  initialTagLimits: z.boolean().optional(),
});

export const UpdateAnonUserDiscoverySchema = z.object({
  docRef: z.custom<FirebaseFirestore.DocumentReference>(),
  platform: SocialPlatformSchema,
  discoveryInfo: DiscoveryInfoSchema,
});

export const HandleSocialUserSchema = z.object({
  hashedUsername: z.string(),
  platform: SocialPlatformSchema,
  discoveryInfo: DiscoveryInfoSchema,
  initialTagLimits: z.boolean().optional(),
});

export const UpdateStatusParamsSchema = z.object({
  userId: z.string(),
  status: StatusSchema,
  metadata: z.record(z.any()).optional(),
});

export const LinkParamsSchema = z.object({
  userId: z.string(),
  linkedId: z.string(),
});

// Request Validation Schemas
export const FindAnonUserRequestSchema = z.object({
  params: z.object({
    hashedUsername: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const FindAnonUserByUsernameRequestSchema = z.object({
  body: z.object({
    hashedUsername: z.string(),
    platform: SocialPlatformSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const CreateAnonUserRequestSchema = z.object({
  body: z.object({
    hashedUsername: z.string(),
    platform: SocialPlatformSchema,
    discoveryInfo: DiscoveryInfoSchema,
    initialTagLimits: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateAnonUserDiscoveryRequestSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
  body: z.object({
    platform: SocialPlatformSchema,
    discoveryInfo: DiscoveryInfoSchema,
  }),
  query: z.object({}).optional(),
});

export const HandleSocialUserRequestSchema = z.object({
  body: z.object({
    hashedUsername: z.string(),
    platform: SocialPlatformSchema,
    discoveryInfo: DiscoveryInfoSchema,
    initialTagLimits: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateStatusRequestSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
  body: z.object({
    status: StatusSchema,
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
});

export const LinkRequestSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
  body: z.object({
    linkedId: z.string(),
  }),
  query: z.object({}).optional(),
});

// Export domain types
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type SocialIdentity = z.infer<typeof SocialIdentitySchema>;
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;
export type AnonUser = z.infer<typeof AnonUserSchema>;

// Export pure function parameter types
export type DiscoveryInfo = z.infer<typeof DiscoveryInfoSchema>;
export type CreateAnonUserData = z.infer<typeof CreateAnonUserDataSchema>;
export type CreateDiscoveryUpdate = z.infer<typeof CreateDiscoveryUpdateSchema>;

// Export database operation parameter types
export type FindAnonUserParams = z.infer<typeof FindAnonUserParamsSchema>;
export type FindAnonUserByUsername = z.infer<typeof FindAnonUserByUsernameSchema>;
export type CreateAnonUser = z.infer<typeof CreateAnonUserSchema>;
export type UpdateAnonUserDiscovery = z.infer<typeof UpdateAnonUserDiscoverySchema>;
export type HandleSocialUser = z.infer<typeof HandleSocialUserSchema>;
export type UpdateStatusParams = z.infer<typeof UpdateStatusParamsSchema>;
export type LinkParams = z.infer<typeof LinkParamsSchema>;

// Export request types
export type FindAnonUserRequest = z.infer<typeof FindAnonUserRequestSchema>;
export type FindAnonUserByUsernameRequest = z.infer<typeof FindAnonUserByUsernameRequestSchema>;
export type CreateAnonUserRequest = z.infer<typeof CreateAnonUserRequestSchema>;
export type UpdateAnonUserDiscoveryRequest = z.infer<typeof UpdateAnonUserDiscoveryRequestSchema>;
export type HandleSocialUserRequest = z.infer<typeof HandleSocialUserRequestSchema>;
export type UpdateStatusRequest = z.infer<typeof UpdateStatusRequestSchema>;
export type LinkRequest = z.infer<typeof LinkRequestSchema>;
