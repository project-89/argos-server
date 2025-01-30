import { z } from "zod";

/**
 * Schema for skill analysis results from AI
 */
export const SkillAnalysisSchema = z.object({
  type: z
    .string()
    .describe("The most appropriate skill type (e.g., Development, Design, Art, Music)"),
  category: z.string().describe("A specific category within the skill type"),
  parentType: z.string().optional().describe("A broader parent type if applicable"),
  keywords: z.array(z.string()).describe("Key terms that describe this skill"),
  aliases: z.array(z.string()).describe("Alternative names or ways to describe this skill"),
});

export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema>;

/**
 * Schema for skill similarity comparison results
 */
export const SkillSimilaritySchema = z.object({
  similarity: z.number().min(0).max(1).describe("Similarity score between 0 and 1"),
  reasons: z.array(z.string()).describe("Reasons for the similarity score"),
});

export type SkillSimilarity = z.infer<typeof SkillSimilaritySchema>;

/**
 * Default values for when skill analysis fails
 */
export const DEFAULT_SKILL_ANALYSIS: SkillAnalysis = {
  type: "Other",
  category: "General",
  keywords: [],
  aliases: [],
};
