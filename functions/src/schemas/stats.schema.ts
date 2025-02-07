import { z } from "zod";

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
