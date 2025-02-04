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
  type: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  aliases: z.array(z.string()),
  parentType: z.string().optional(),
});

export const SkillSimilaritySchema = z.object({
  similarity: z.number(),
});

export const SkillMatchSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    description: z.string(),
  }),
});
