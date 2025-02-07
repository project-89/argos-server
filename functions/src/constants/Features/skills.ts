import { SkillAnalysis } from "../../types/services/skills.hivemind.types";

/**
 * Default values for when skill analysis fails
 */
export const DEFAULT_SKILL_ANALYSIS: SkillAnalysis = {
  type: "Other",
  category: "General",
  keywords: [],
  aliases: [],
} as const;
