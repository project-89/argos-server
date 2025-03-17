import { z } from "zod";

import { ALLOWED_TAG_TYPES } from "../constants";
import { AnonUser, SocialPlatformSchema } from ".";

// Base schemas

export const TagTimeFrameSchema = z.enum(["daily", "weekly", "monthly", "allTime"]);

// Domain Models
export const TagDataSchema = z.object({
  type: z.string(),
  taggedBy: z.string(),
  taggedAt: z.number(),
  platform: SocialPlatformSchema,
});

export const TagLimitDataSchema = z.object({
  firstTaggedAt: z.number(),
  remainingDailyTags: z.number(),
  lastTagResetAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const TagLeaderboardEntrySchema = z.object({
  fingerprintId: z.string(),
  totalTags: z.number(),
  lastTagAt: z.number(),
  streak: z.number(),
  tagTypes: z.record(z.string(), z.number()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const TagLeaderboardResponseSchema = z.object({
  timeFrame: TagTimeFrameSchema,
  entries: z.array(
    TagLeaderboardEntrySchema.omit({
      lastTagAt: true,
      createdAt: true,
      updatedAt: true,
    }).extend({
      lastTagAt: z.number(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
  ),
  userRank: z.number().optional(),
  generatedAt: z.number(),
});

export const TagStatsSchema = z.object({
  id: z.string(),
  fingerprintId: z.string(),
  totalTagsMade: z.number(),
  lastTagAt: z.number(),
  dailyTags: z.number(),
  weeklyTags: z.number(),
  monthlyTags: z.number(),
  streak: z.number(),
  tagTypes: z.record(z.string(), z.number()),
  createdAt: z.number(),
  updatedAt: z.number(),
  tagHistory: z.array(TagDataSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Internal function parameter schemas
export const AddTagParamsSchema = z.object({
  anonUserId: z.string(),
  tag: TagDataSchema,
});

export const CheckTagLimitsParamsSchema = z.object({
  taggerRecord: z.custom<AnonUser>(),
  targetHasTag: z.boolean(),
});

export const TagUserParamsSchema = z.object({
  taggerUsername: z.string(),
  targetUsername: z.string(),
  platform: SocialPlatformSchema.default("x"),
  tagType: z.string(),
});

// Request/Response schemas
export const TagUserRequestSchema = z.object({
  params: z.object({
    tagType: z.string(),
  }),
  body: z.object({
    taggerUsername: z.string(),
    targetUsername: z.string(),
    platform: SocialPlatformSchema.default("x"),
  }),
  query: z.object({}).optional(),
});

export const TagResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  remainingTags: z.number(),
});

export const GetUserTagsSchema = z.object({
  params: z.object({
    username: z.string(),
  }),
  query: z.object({
    platform: SocialPlatformSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const GetTagLeaderboardSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    timeFrame: TagTimeFrameSchema.optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  }),
  body: z.object({}).optional(),
});

// Type Exports
export type TagData = z.infer<typeof TagDataSchema>;
export type TagLimitData = z.infer<typeof TagLimitDataSchema>;
export type TagLeaderboardEntry = z.infer<typeof TagLeaderboardEntrySchema>;
export type TagLeaderboardResponse = z.infer<typeof TagLeaderboardResponseSchema>;
export type TagStats = z.infer<typeof TagStatsSchema>;
export type TagType = (typeof ALLOWED_TAG_TYPES)[keyof typeof ALLOWED_TAG_TYPES];
export type TagPlatform = z.infer<typeof SocialPlatformSchema>;
// Request Types
export type TagUserRequest = z.infer<typeof TagUserRequestSchema>;
export type GetUserTagsRequest = z.infer<typeof GetUserTagsSchema>;
export type GetTagLeaderboardRequest = z.infer<typeof GetTagLeaderboardSchema>;
export type TagResponse = z.infer<typeof TagResponseSchema>;

// Internal function parameter types
export type AddTagParams = z.infer<typeof AddTagParamsSchema>;
export type CheckTagLimitsParams = z.infer<typeof CheckTagLimitsParamsSchema>;
export type TagUserParams = z.infer<typeof TagUserParamsSchema>;
