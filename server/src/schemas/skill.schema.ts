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
export const SkillSearchRequestSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

export const AnalyzeSkillRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    description: z.string(),
  }),
});

export const CreateSkillRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    name: z.string(),
    description: z.string().optional(),
    type: z.string(),
    category: z.string(),
    parentType: z.string().optional(),
    keywords: z.array(z.string()),
    aliases: z.array(z.string()),
  }),
});

export const UpdateSkillRequestSchema = z.object({
  params: z.object({
    skillId: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    parentType: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional(),
  }),
});

export const DeleteSkillRequestSchema = z.object({
  params: z.object({
    skillId: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
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
export type SkillSearchRequest = z.infer<typeof SkillSearchRequestSchema>;
export type AnalyzeSkillRequest = z.infer<typeof AnalyzeSkillRequestSchema>;
export type CreateSkillRequest = z.infer<typeof CreateSkillRequestSchema>;
export type UpdateSkillRequest = z.infer<typeof UpdateSkillRequestSchema>;
export type DeleteSkillRequest = z.infer<typeof DeleteSkillRequestSchema>;
export type AnalyzeSkillResponse = z.infer<typeof AnalyzeSkillResponseSchema>;
