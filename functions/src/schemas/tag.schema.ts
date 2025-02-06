import { z } from "zod";

export const TagUserSchema = z.object({
  body: z.object({
    taggerUsername: z.string(),
    username: z.string(),
    platform: z.literal("x"),
  }),
  params: z.object({
    tagType: z.string(),
  }),
  query: z.object({}).optional(),
});

export const GetUserTagsSchema = z.object({
  params: z.object({
    username: z.string(),
  }),
  query: z.object({
    platform: z.enum(["x"]).optional(),
  }),
  body: z.object({}).optional(),
});

export const GetTagLeaderboardSchema = z.object({
  query: z.object({
    timeframe: z.enum(["daily", "weekly", "monthly", "allTime"]).optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
