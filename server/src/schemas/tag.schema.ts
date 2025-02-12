import { z } from "zod";

import { ALLOWED_TAG_TYPES } from "../constants";
import { AnonSocialUser, TimestampSchema } from ".";

// Base schemas
export const TagPlatformSchema = z.enum(["x"]);
export const TagTimeFrameSchema = z.enum(["daily", "weekly", "monthly", "allTime"]);

// Domain Models
export const TagDataSchema = z.object({
  type: z.string(),
  taggedBy: z.string(),
  taggedAt: TimestampSchema,
  platform: TagPlatformSchema,
});

export const TagLimitDataSchema = z.object({
  firstTaggedAt: TimestampSchema,
  remainingDailyTags: z.number(),
  lastTagResetAt: TimestampSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const TagLeaderboardEntrySchema = z.object({
  fingerprintId: z.string(),
  totalTags: z.number(),
  lastTagAt: TimestampSchema,
  streak: z.number(),
  tagTypes: z.record(z.string(), z.number()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
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
  lastTagAt: TimestampSchema,
  dailyTags: z.number(),
  weeklyTags: z.number(),
  monthlyTags: z.number(),
  streak: z.number(),
  tagTypes: z.record(z.string(), z.number()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  tagHistory: z.array(TagDataSchema).optional(),
});

// Internal function parameter schemas
export const AddTagParamsSchema = z.object({
  anonUserId: z.string(),
  tag: TagDataSchema,
});

export const CheckTagLimitsParamsSchema = z.object({
  taggerRecord: z.custom<AnonSocialUser>(),
  targetHasTag: z.boolean(),
});

export const TagUserParamsSchema = z.object({
  taggerUsername: z.string(),
  targetUsername: z.string(),
  platform: TagPlatformSchema.default("x"),
  tagType: z.string(),
});

// Request/Response schemas
export const TagUserRequestSchema = z.object({
  body: z.object({
    taggerUsername: z.string(),
    targetUsername: z.string(),
    platform: TagPlatformSchema.default("x"),
    tagType: z.string(),
  }),
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
    platform: TagPlatformSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const GetTagLeaderboardSchema = z.object({
  query: z.object({
    timeFrame: TagTimeFrameSchema.optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Type Exports
export type TagData = z.infer<typeof TagDataSchema>;
export type TagLimitData = z.infer<typeof TagLimitDataSchema>;
export type TagLeaderboardEntry = z.infer<typeof TagLeaderboardEntrySchema>;
export type TagLeaderboardResponse = z.infer<typeof TagLeaderboardResponseSchema>;
export type TagStats = z.infer<typeof TagStatsSchema>;
export type TagType = (typeof ALLOWED_TAG_TYPES)[keyof typeof ALLOWED_TAG_TYPES];
export type TagPlatform = z.infer<typeof TagPlatformSchema>;
// Request Types
export type TagUserRequest = z.infer<typeof TagUserRequestSchema>;
export type GetUserTagsRequest = z.infer<typeof GetUserTagsSchema>;
export type GetTagLeaderboardRequest = z.infer<typeof GetTagLeaderboardSchema>;
export type TagResponse = z.infer<typeof TagResponseSchema>;

// Internal function parameter types
export type AddTagParams = z.infer<typeof AddTagParamsSchema>;
export type CheckTagLimitsParams = z.infer<typeof CheckTagLimitsParamsSchema>;
export type TagUserParams = z.infer<typeof TagUserParamsSchema>;
