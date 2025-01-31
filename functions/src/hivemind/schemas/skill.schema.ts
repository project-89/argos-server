import { z } from "zod";

export const SkillSearchSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

export const SkillAnalysisSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    description: z.string(),
  }),
});

export const SkillSimilaritySchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    description: z.string(),
  }),
});

export const SkillMatchSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    description: z.string(),
  }),
});
