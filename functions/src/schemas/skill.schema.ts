import { z } from "zod";
import { TimestampSchema } from ".";

// Domain Models
export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  category: z.string(),
  parentType: z.string().optional(),
  keywords: z.array(z.string()),
  aliases: z.array(z.string()),
  useCount: z.number(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
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
  skill: SkillSchema,
  confidence: z.number(),
  matchedOn: z.object({
    name: z.boolean(),
    aliases: z.boolean(),
    keywords: z.boolean(),
    category: z.boolean(),
  }),
});

// Request/Response Validation Schemas
export const SkillSearchSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

export const AnalyzeSkillInputSchema = z.object({
  description: z.string(),
});

export const AnalyzeSkillResponseSchema = z.object({
  matches: z.array(SkillMatchSchema),
  suggestedType: z.string(),
  suggestedCategory: z.string(),
  extractedKeywords: z.array(z.string()),
  parentType: z.string().optional(),
});

// Type Exports
export type Skill = z.infer<typeof SkillSchema>;
export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema>;
export type SkillMatch = z.infer<typeof SkillMatchSchema>;
export type AnalyzeSkillInput = z.infer<typeof AnalyzeSkillInputSchema>;
export type AnalyzeSkillResponse = z.infer<typeof AnalyzeSkillResponseSchema>;
