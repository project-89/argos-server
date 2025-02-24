import { getFirestore } from "firebase-admin/firestore";
import { ApiError } from "../utils";
import {
  AnalyzeSkillResponse,
  SearchCapabilitiesInput,
  SkillMatch,
  Skill,
  SkillAnalysisSchema,
  SkillSimilaritySchema,
  SkillAnalysis,
} from "../schemas";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { DEFAULT_SKILL_ANALYSIS, ERROR_MESSAGES, COLLECTIONS } from "../constants";

// Initialize Gemini model with the Google provider
const geminiModel = google("gemini-pro");

export const skillMatchingService = {
  /**
   * Analyze a natural language skill description and find matching capabilities
   */
  async analyzeSkill({ description }: { description: string }): Promise<AnalyzeSkillResponse> {
    console.log("[analyzeSkill] Starting with input:", description);

    try {
      // First, use structured data generation to analyze the skill description
      const analysis = await this.analyzeWithStructuredData(description).catch((error) => {
        console.error("[analyzeSkill] Structured analysis failed:", error);
        return DEFAULT_SKILL_ANALYSIS;
      });

      // Search for matching capabilities
      let matches: SkillMatch[] = [];
      try {
        matches = await this.findMatches(description, analysis);
      } catch (error) {
        console.error("[analyzeSkill] Finding matches failed:", error);
        // Continue with empty matches if matching fails
      }

      return {
        matches,
        suggestedType: analysis.type,
        suggestedCategory: analysis.category,
        extractedKeywords: analysis.keywords,
        parentType: analysis.parentType,
      };
    } catch (error) {
      console.error("[analyzeSkill] Error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Use structured data generation to analyze skill description
   */
  async analyzeWithStructuredData(description: string): Promise<SkillAnalysis> {
    const prompt = `Analyze the following skill description and extract key information:
    
Description: "${description}"

Provide structured data with:
1. The most appropriate skill type (e.g., Development, Design, Art, Music, etc.)
2. A specific category within that type
3. A broader parent type if applicable
4. Key terms/keywords that describe this skill
5. Possible alternative names or ways to describe this skill`;

    try {
      const { object } = await generateObject({
        model: geminiModel,
        schema: SkillAnalysisSchema,
        prompt,
      });
      return object;
    } catch (error) {
      console.error("[analyzeWithStructuredData] Analysis failed:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Find matching capabilities based on description and structured data analysis
   */
  async findMatches(description: string, analysis: SkillAnalysis): Promise<SkillMatch[]> {
    try {
      const db = getFirestore();
      const collection = db.collection(COLLECTIONS.SKILLS);

      // Get capabilities of the same type or parent type
      const typeMatches = collection.where("type", "==", analysis.type);
      const parentTypeMatches = analysis.parentType
        ? collection.where("parentType", "==", analysis.parentType)
        : null;

      const [typeSnapshot, parentSnapshot] = await Promise.all([
        typeMatches.orderBy("useCount", "desc").limit(5).get(),
        parentTypeMatches?.orderBy("useCount", "desc").limit(5).get(),
      ]);

      const matches: SkillMatch[] = [];

      // Process direct type matches
      for (const doc of typeSnapshot.docs) {
        const skill = doc.data() as Skill;
        try {
          const confidence = await this.calculateSimilarity(description, skill);

          if (confidence > 0.5) {
            matches.push({
              skill: this.mapToSkill(skill),
              confidence,
              matchedOn: {
                name: this.hasNameMatch(description, skill.name),
                aliases: this.hasAliasMatch(description, skill.aliases),
                keywords: this.hasKeywordMatch(description, skill.keywords),
                category: skill.category === analysis.category,
              },
            });
          }
        } catch (error) {
          console.error("[findMatches] Failed to calculate similarity:", error);
          // Continue with next match if similarity calculation fails
        }
      }

      // Process parent type matches if any
      if (parentSnapshot) {
        for (const doc of parentSnapshot.docs) {
          const skill = doc.data() as Skill;
          try {
            const confidence = await this.calculateSimilarity(description, skill);

            if (confidence > 0.4) {
              matches.push({
                skill: this.mapToSkill(skill),
                confidence: confidence * 0.8,
                matchedOn: {
                  name: this.hasNameMatch(description, skill.name),
                  aliases: this.hasAliasMatch(description, skill.aliases),
                  keywords: this.hasKeywordMatch(description, skill.keywords),
                  category: skill.category === analysis.category,
                },
              });
            }
          } catch (error) {
            console.error("[findMatches] Failed to calculate similarity for parent match:", error);
            // Continue with next match if similarity calculation fails
          }
        }
      }

      return matches.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error("[findMatches] Database error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Calculate similarity between description and skill using structured data generation
   */
  async calculateSimilarity(description: string, skill: Skill): Promise<number> {
    const prompt = `Compare these two skill descriptions and rate their similarity:

Skill 1: "${description}"
Skill 2: "${skill.name}${skill.description ? ` - ${skill.description}` : ""}"

Consider:
1. Are they describing the same fundamental skill?
2. Are they closely related skills?
3. Do they share significant keywords or concepts?

Provide a similarity score between 0 and 1, and list the reasons for your score.`;

    try {
      const { object } = await generateObject({
        model: geminiModel,
        schema: SkillSimilaritySchema,
        prompt,
      });

      // Adjust confidence based on other factors
      let confidence = object.similarity;

      // Boost confidence if keywords match
      const keywordMatch = this.hasKeywordMatch(description, skill.keywords);
      if (keywordMatch) confidence += 0.1;

      // Boost confidence if aliases match
      const aliasMatch = this.hasAliasMatch(description, skill.aliases);
      if (aliasMatch) confidence += 0.1;

      // Cap at 1.0
      return Math.min(confidence, 1.0);
    } catch (error) {
      console.error("[calculateSimilarity] Similarity calculation failed:", error);
      return 0;
    }
  },

  /**
   * Map SkillModel to Skill interface
   */
  mapToSkill(model: Skill): Skill {
    try {
      return {
        ...model,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      };
    } catch (error) {
      console.error("[mapToSkill] Error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Check if description matches skill name (fuzzy match)
   */
  hasNameMatch(description: string, name: string): boolean {
    try {
      return (
        description.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(description.toLowerCase())
      );
    } catch (error) {
      console.error("[hasNameMatch] Error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Check if description matches any aliases
   */
  hasAliasMatch(description: string, aliases?: string[]): boolean {
    try {
      if (!aliases) return false;
      return aliases.some(
        (alias) =>
          description.toLowerCase().includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(description.toLowerCase()),
      );
    } catch (error) {
      console.error("[hasAliasMatch] Error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Check if description contains any matching keywords
   */
  hasKeywordMatch(description: string, keywords?: string[]): boolean {
    try {
      if (!keywords) return false;
      return keywords.some((keyword) => description.toLowerCase().includes(keyword.toLowerCase()));
    } catch (error) {
      console.error("[hasKeywordMatch] Error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Search capabilities for autocomplete
   */
  async searchCapabilities(input: SearchCapabilitiesInput): Promise<Skill[]> {
    try {
      console.log("[searchCapabilities] Starting with input:", input);
      const db = getFirestore();
      const collection = db.collection(COLLECTIONS.SKILLS);

      let query = collection.orderBy("useCount", "desc");

      if (input.type) {
        query = query.where("type", "==", input.type);
      }

      if (input.category) {
        query = query.where("category", "==", input.category);
      }

      if (input.parentType) {
        query = query.where("parentType", "==", input.parentType);
      }

      const snapshot = await query.limit(input.limit || 10).get();

      // Filter results client-side based on query
      const results = snapshot.docs
        .map((doc) => this.mapToSkill(doc.data() as Skill))
        .filter((skill) => {
          const searchTerms = input.query.toLowerCase().split(" ");
          const searchableText = [
            skill.name,
            skill.description,
            ...(skill.aliases || []),
            ...(skill.keywords || []),
          ]
            .join(" ")
            .toLowerCase();

          return searchTerms.every((term) => searchableText.includes(term));
        });

      return results;
    } catch (error) {
      console.error("[searchCapabilities] Error:", error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
};
