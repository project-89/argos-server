import { z } from "zod";
import { SkillAnalysisSchema, SkillSimilaritySchema } from "../schemas/schemas";

export type SkillSimilarity = z.infer<typeof SkillSimilaritySchema>;
export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema>;
