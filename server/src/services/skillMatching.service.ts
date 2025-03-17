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
import { generateObject, GenerateObjectResult } from "ai";
import { google } from "@ai-sdk/google";
import { DEFAULT_SKILL_ANALYSIS, ERROR_MESSAGES, COLLECTIONS } from "../constants";
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";

const LOG_PREFIX = "[Skill Matching Service]";

// Initialize Gemini model with the Google provider
const geminiModel = google("gemini-pro");

export const skillMatchingService = {
  /**
   * Analyze a natural language skill description and find matching capabilities
   */
  async analyzeSkill({ description }: { description: string }): Promise<AnalyzeSkillResponse> {
    console.log(`${LOG_PREFIX} Starting with input:`, description);

    try {
      // First, use structured data generation to analyze the skill description
      const analysis = await this.analyzeWithStructuredData(description).catch((error) => {
        console.error(`${LOG_PREFIX} Structured analysis failed:`, error);
        return DEFAULT_SKILL_ANALYSIS;
      });

      // Search for matching capabilities
      let matches: SkillMatch[] = [];
      try {
        matches = await this.findMatches(description, analysis);
      } catch (error) {
        console.error(`${LOG_PREFIX} Finding matches failed:`, error);
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
      console.error(`${LOG_PREFIX} Error:`, error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Use AI to analyze a skill description and extract structured data
   */
  async analyzeWithStructuredData(description: string): Promise<SkillAnalysis> {
    try {
      const result = await generateObject({
        model: geminiModel,
        schema: SkillAnalysisSchema,
        prompt: `Analyze this skill description and extract the following information: type, category, keywords, and aliases. If possible, also identify a broader parent type. The description is: "${description}"`,
      });

      // Extract the analysis from the result
      const skillAnalysis: SkillAnalysis = {
        type: result.object.type,
        category: result.object.category,
        keywords: result.object.keywords,
        aliases: result.object.aliases,
        parentType: result.object.parentType,
      };

      // If no type was detected, try to infer from the description
      if (!skillAnalysis.type) {
        const words = description.toLowerCase().split(/\s+/);
        const possibleTypes = ["technical", "creative", "professional", "soft", "language"];

        skillAnalysis.type = possibleTypes.find((type) => words.includes(type)) || "technical";
      }

      return skillAnalysis;
    } catch (error) {
      console.error(`${LOG_PREFIX} AI analysis failed:`, error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Find matching skills in the database
   */
  async findMatches(description: string, analysis: SkillAnalysis): Promise<SkillMatch[]> {
    const db = await getDb();

    try {
      const { type, category, keywords } = analysis;

      // First, try to find exact name matches (case insensitive)
      const words = description.toLowerCase().split(/\s+/);
      const nameQuery = words
        .filter((word) => word.length > 3) // Skip short words
        .map((word) => ({ name: { $regex: word, $options: "i" } }));

      // Then find by type and category
      const categoricalQuery: any[] = [];
      if (type) {
        categoricalQuery.push({ type: { $regex: type, $options: "i" } });
      }
      if (category) {
        categoricalQuery.push({ category: { $regex: category, $options: "i" } });
      }

      // Then find by keywords
      const keywordQuery: any[] = [];
      if (keywords && keywords.length > 0) {
        keywordQuery.push({
          keywords: { $in: keywords.map((kw) => new RegExp(kw, "i")) },
        });
      }

      // Combine the queries (any match is a potential candidate)
      const query = {
        $or: [
          ...nameQuery,
          ...categoricalQuery,
          ...keywordQuery,
          { aliases: { $elemMatch: { $regex: description, $options: "i" } } },
        ],
      };

      // Execute the query
      const skills = await db.collection(COLLECTIONS.SKILLS).find(query).limit(10).toArray();

      // Calculate similarity scores for each skill
      const matchPromises = skills.map(async (skill) => {
        let similarity = 0;

        // Calculate match confidence based on different criteria
        const nameMatch = this.hasNameMatch(description, skill.name);
        const aliasMatch = this.hasAliasMatch(description, skill.aliases);
        const keywordMatch = this.hasKeywordMatch(description, skill.keywords);
        const categoryMatch = skill.category
          ? skill.category.toLowerCase() === (category?.toLowerCase() || "")
          : false;

        // Add a base similarity score
        similarity += nameMatch ? 0.6 : 0;
        similarity += aliasMatch ? 0.3 : 0;
        similarity += keywordMatch ? 0.2 : 0;
        similarity += categoryMatch ? 0.1 : 0;
        similarity += type && skill.type.toLowerCase() === type.toLowerCase() ? 0.1 : 0;

        // If no direct matches, try to calculate a more nuanced similarity score
        if (similarity === 0) {
          try {
            similarity = await this.calculateSimilarity(description, skill);
          } catch (error) {
            // If AI similarity fails, use a very basic heuristic
            const descWords = description.toLowerCase().split(/\s+/);
            const skillWords = `${skill.name} ${skill.description || ""} ${
              skill.keywords?.join(" ") || ""
            }`
              .toLowerCase()
              .split(/\s+/);

            const commonWords = descWords.filter(
              (word) => word.length > 3 && skillWords.includes(word),
            );

            similarity = (commonWords.length / Math.max(descWords.length, 1)) * 0.2;
          }
        }

        // Apply a boost for popular skills
        similarity += Math.min(skill.useCount / 100, 0.1);

        return {
          skill: this.mapToSkill(skill),
          confidence: parseFloat(similarity.toFixed(2)),
          matchedOn: {
            name: nameMatch,
            aliases: aliasMatch,
            keywords: keywordMatch,
            category: categoryMatch,
          },
        };
      });

      // Resolve all matches
      const matches = await Promise.all(matchPromises);

      // Sort by confidence score
      return matches
        .filter((match) => match.confidence > 0.1) // Filter out low confidence matches
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error finding matches:`, error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Calculate AI-powered similarity between a description and a skill
   */
  async calculateSimilarity(description: string, skill: Skill): Promise<number> {
    try {
      const skillText = `${skill.name}${skill.description ? `: ${skill.description}` : ""} (${
        skill.type
      }, ${skill.category})`;

      const result = await generateObject({
        model: geminiModel,
        schema: SkillSimilaritySchema,
        prompt: `
          You are a specialized AI for calculating semantic similarity between skills.
          
          Skill description: "${description}"
          Existing skill: "${skillText}"
          
          Calculate a similarity score between 0 and 1, where:
          - 0 means completely unrelated
          - 0.3 means somewhat related
          - 0.6 means closely related
          - 0.9+ means extremely similar or identical
          
          Consider type, category, and semantic meaning. Return only the similarity score.
        `,
      });

      return result.object.similarity;
    } catch (error) {
      console.error(`${LOG_PREFIX} AI similarity calculation failed:`, error);
      throw error; // Let the caller handle this error
    }
  },

  /**
   * Format a database skill object into the expected Skill type
   */
  mapToSkill(model: Skill): Skill {
    return {
      ...model,
      // Ensure all fields are present with defaults if missing
      category: model.category || "",
      keywords: model.keywords || [],
      aliases: model.aliases || [],
      useCount: model.useCount || 0,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  },

  /**
   * Check if a skill name matches the description
   */
  hasNameMatch(description: string, name: string): boolean {
    if (!name) return false;

    const cleanDesc = description.toLowerCase().trim();
    const cleanName = name.toLowerCase().trim();

    return (
      cleanDesc.includes(cleanName) || cleanName.includes(cleanDesc) || cleanDesc === cleanName
    );
  },

  /**
   * Check if any alias matches the description
   */
  hasAliasMatch(description: string, aliases?: string[]): boolean {
    if (!aliases || aliases.length === 0) return false;

    const cleanDesc = description.toLowerCase().trim();

    return aliases.some(
      (alias) =>
        alias &&
        (cleanDesc.includes(alias.toLowerCase()) || alias.toLowerCase().includes(cleanDesc)),
    );
  },

  /**
   * Check if any keyword matches the description
   */
  hasKeywordMatch(description: string, keywords?: string[]): boolean {
    if (!keywords || keywords.length === 0) return false;

    const words = description.toLowerCase().split(/\s+/);

    return keywords.some((keyword) => keyword && words.includes(keyword.toLowerCase()));
  },

  /**
   * Search capabilities with various filters
   */
  async searchCapabilities(input: SearchCapabilitiesInput): Promise<Skill[]> {
    try {
      const db = await getDb();
      const { query, limit = 10, type, category, parentType } = input;

      // Build the query filters
      const filters: any = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { aliases: { $elemMatch: { $regex: query, $options: "i" } } },
          { keywords: { $elemMatch: { $regex: query, $options: "i" } } },
        ],
      };

      // Add optional filters
      if (type) filters.type = type;
      if (category) filters.category = category;
      if (parentType) filters.parentType = parentType;

      // Execute the query
      const skills = await db
        .collection(COLLECTIONS.SKILLS)
        .find(filters)
        .sort({ useCount: -1 })
        .limit(limit)
        .toArray();

      return formatDocuments(skills) as Skill[];
    } catch (error) {
      console.error(`${LOG_PREFIX} Error searching capabilities:`, error);
      throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_FIND_SIMILAR_SKILLS);
    }
  },
};
