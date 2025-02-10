import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";
import { cleanDatabase } from "../utils/testUtils";
import { skillMatchingService } from "../../services/skillMatching.hivemind.service";
import { SkillModel } from "../../types/services";

// Increase timeout for all tests in this file
jest.setTimeout(60000); // 60 seconds

describe("SkillMatchingService", () => {
  const db = getFirestore();
  const testSkills: SkillModel[] = [
    {
      id: "skill-1",
      name: "React Development",
      type: "Development",
      category: "Frontend",
      description: "Building web applications with React",
      keywords: ["react", "javascript", "frontend", "web development"],
      aliases: ["ReactJS", "React.js"],
      parentType: "Web Development",
      useCount: 5,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: "skill-2",
      name: "Node.js Development",
      type: "Development",
      category: "Backend",
      description: "Server-side development with Node.js",
      keywords: ["node", "javascript", "backend", "server"],
      aliases: ["NodeJS", "Node"],
      parentType: "Web Development",
      useCount: 3,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  beforeEach(async () => {
    await cleanDatabase();
    // Add test skills to the database
    for (const skill of testSkills) {
      await db.collection(COLLECTIONS.SKILLS).doc(skill.id).set(skill);
    }
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("analyzeSkill", () => {
    it("should analyze a skill description and find matches", async () => {
      console.log("Starting skill analysis test...");
      const result = await skillMatchingService.analyzeSkill({
        description: "React frontend development with modern web technologies",
      });

      console.log("Analysis result:", JSON.stringify(result, null, 2));

      // Verify we got a response with the expected structure
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
      expect(result.suggestedType).toBeDefined();
      expect(result.suggestedCategory).toBeDefined();
      expect(result.extractedKeywords).toBeDefined();

      // If we got matches, verify their structure
      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match.skill).toBeDefined();
        expect(match.confidence).toBeGreaterThan(0);
        expect(match.matchedOn).toBeDefined();
      }
    });

    it("should handle descriptions with no matches", async () => {
      console.log("Starting no matches test...");
      const result = await skillMatchingService.analyzeSkill({
        description: "Underwater basket weaving with traditional techniques",
      });

      console.log("No matches result:", JSON.stringify(result, null, 2));

      // Should still provide analysis even with no matches
      expect(result).toBeDefined();
      expect(result.suggestedType).toBeDefined();
      expect(result.suggestedCategory).toBeDefined();
      expect(result.extractedKeywords).toBeDefined();
    });

    it("should handle malformed descriptions", async () => {
      console.log("Starting malformed description test...");
      const result = await skillMatchingService.analyzeSkill({
        description: "", // Empty description
      });

      // Verify we get default values for empty description
      expect(result).toEqual({
        extractedKeywords: [],
        matches: [],
        parentType: undefined,
        suggestedCategory: "General",
        suggestedType: "Other",
      });
    });

    it("should analyze complex technical skills", async () => {
      console.log("Starting complex skill analysis test...");
      const result = await skillMatchingService.analyzeSkill({
        description: "Building scalable microservices with Node.js, Express, and MongoDB",
      });

      console.log("Complex analysis result:", JSON.stringify(result, null, 2));

      // Verify we got a response with the expected structure
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
      expect(result.suggestedType).toBeDefined();
      expect(result.suggestedCategory).toBeDefined();
      expect(result.extractedKeywords).toBeDefined();

      // If we got matches, verify their structure
      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match.skill).toBeDefined();
        expect(match.confidence).toBeGreaterThan(0);
        expect(match.matchedOn).toBeDefined();
      }
    });
  });

  describe("searchCapabilities", () => {
    it("should find skills based on search query", async () => {
      const results = await skillMatchingService.searchCapabilities({
        query: "react",
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("React Development");
    });

    it("should filter by type", async () => {
      const results = await skillMatchingService.searchCapabilities({
        query: "development",
        type: "Development",
        category: "Frontend",
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.type).toBe("Development");
        expect(result.category).toBe("Frontend");
      });
    });

    it("should respect the limit parameter", async () => {
      const results = await skillMatchingService.searchCapabilities({
        query: "development",
        limit: 1,
      });

      expect(results).toHaveLength(1);
    });

    it("should search across name, description, aliases, and keywords", async () => {
      const results = await skillMatchingService.searchCapabilities({
        query: "reactjs",
        limit: 10,
      });

      expect(results).toHaveLength(1); // Should find React Development through its alias
      expect(results[0].name).toBe("React Development");
    });
  });
});
