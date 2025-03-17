import { z } from "zod";

// Domain Models
export const StatsSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  missionsCompleted: z.number(),
  successRate: z.number(),
  totalRewards: z.number(),
  reputation: z.number(),
  joinedAt: z.number(),
  lastActive: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const StatsResponseSchema = StatsSchema;

// Request/Response Validation Schemas
export const StatsGetSchema = z.object({
  params: z.object({
    profileId: z.string(),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const StatsUpdateSchema = z.object({
  params: z.object({
    profileId: z.string(),
  }),
  body: z.object({
    missionsCompleted: z.number().optional(),
    successRate: z
      .number()
      .min(0, "Success rate must be between 0 and 100")
      .max(100, "Success rate must be between 0 and 100")
      .optional(),
    totalRewards: z.number().optional(),
    reputation: z.number().optional(),
  }),
  query: z.object({}).optional(),
});

// Type Exports
export type Stats = z.infer<typeof StatsSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type StatsGetRequest = z.infer<typeof StatsGetSchema>;
export type StatsUpdateRequest = z.infer<typeof StatsUpdateSchema>;
