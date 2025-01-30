import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { TEST_CONFIG } from "../../setup/testConfig";
import { makeRequest, createTestData, cleanDatabase, destroyAgent } from "../../utils/testUtils";
import { ERROR_MESSAGES } from "../../../constants/api";
import { SkillLevel } from "../../../hivemind/types/capability.types";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../constants/collections";

describe("Capability Endpoints", () => {
  let fingerprintId: string;
  let validApiKey: string;
  let profileId: string;
  const db = getFirestore();

  // Test skill data
  const testSkill = {
    id: "test-skill-1",
    name: "React Development",
    type: "Development",
    category: "Frontend",
    description: "Building web applications with React",
    keywords: ["react", "javascript", "frontend"],
    aliases: ["ReactJS", "React.js"],
    parentType: "Web Development",
    useCount: 1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  beforeEach(async () => {
    await cleanDatabase();
    // Create fingerprint and get API key
    const testData = await createTestData();
    fingerprintId = testData.fingerprintId;
    validApiKey = testData.apiKey;

    // Create a profile linked to the fingerprint
    const profileResponse = await makeRequest({
      method: "post",
      url: `${TEST_CONFIG.apiUrl}/hivemind/profiles`,
      headers: { "x-api-key": validApiKey },
      data: {
        fingerprintId,
        username: "testuser",
        walletAddress: "0x1234567890123456789012345678901234567890",
      },
    });
    profileId = profileResponse.data.data.id;

    // Add test skill to database
    await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).set(testSkill);
  });

  afterAll(async () => {
    await cleanDatabase();
    destroyAgent();
  });

  describe("createCapability", () => {
    it("should create a new capability with a new skill", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: "Python Development",
          level: SkillLevel.Advanced,
          type: "Development",
          description: "Backend development with Python and Django",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toMatchObject({
        profileId,
        level: SkillLevel.Advanced,
        isVerified: false,
      });

      // Verify skill was created
      const skillDoc = await db
        .collection(COLLECTIONS.SKILLS)
        .doc(response.data.data.skillId)
        .get();
      expect(skillDoc.exists).toBe(true);
      expect(skillDoc.data()).toMatchObject({
        name: "Python Development",
        type: "Development",
        description: "Backend development with Python and Django",
        useCount: 1,
      });
    });

    it("should create a capability using an existing skill", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: testSkill.name,
          level: SkillLevel.Expert,
          type: testSkill.type,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toMatchObject({
        profileId,
        skillId: testSkill.id,
        level: SkillLevel.Expert,
        isVerified: false,
      });

      // Verify useCount was incremented
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(true);
      expect(skillDoc.data()?.useCount).toBe(2);
    });

    it("should throw error if skill analysis fails", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: "Invalid Skill",
          level: SkillLevel.Beginner,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBe(ERROR_MESSAGES.INVALID_INPUT);
    });

    it("should throw error if capability already exists", async () => {
      // First, create a capability
      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: testSkill.name,
          level: SkillLevel.Expert,
          type: testSkill.type,
        },
      });

      // Try to create the same capability again
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: testSkill.name,
          level: SkillLevel.Advanced,
          type: testSkill.type,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBe(ERROR_MESSAGES.CAPABILITY_EXISTS);
    });

    it("should suggest similar skills when close match exists", async () => {
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: "ReactJS Development",
          level: SkillLevel.Advanced,
          type: "Development",
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toContain(ERROR_MESSAGES.SIMILAR_CAPABILITY_EXISTS);
      expect(response.data.error).toContain(testSkill.name);
    });
  });

  describe("getCapabilities", () => {
    it("should get all capabilities for a profile", async () => {
      // Create two capabilities
      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: testSkill.name,
          level: SkillLevel.Expert,
          type: testSkill.type,
        },
      });

      await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: "Python Development",
          level: SkillLevel.Advanced,
          type: "Development",
          description: "Backend development with Python",
        },
      });

      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveLength(2);
      expect(response.data.data[0]).toMatchObject({
        profileId,
        name: testSkill.name,
        level: SkillLevel.Expert,
        type: testSkill.type,
        isVerified: false,
      });
    });

    it("should return empty array if no capabilities found", async () => {
      const response = await makeRequest({
        method: "get",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual([]);
    });
  });

  describe("updateCapability", () => {
    let capabilityId: string;

    beforeEach(async () => {
      // Create a capability to update
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: testSkill.name,
          level: SkillLevel.Advanced,
          type: testSkill.type,
        },
      });
      capabilityId = response.data.data.id;
    });

    it("should update capability level", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities/${capabilityId}`,
        headers: { "x-api-key": validApiKey },
        data: {
          level: SkillLevel.Expert,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toMatchObject({
        id: capabilityId,
        profileId,
        level: SkillLevel.Expert,
      });
    });

    it("should throw error if capability not found", async () => {
      const response = await makeRequest({
        method: "put",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities/invalid-id`,
        headers: { "x-api-key": validApiKey },
        data: {
          level: SkillLevel.Expert,
        },
        validateStatus: () => true,
      });

      expect(response.status).toBe(404);
      expect(response.data.error).toBe(ERROR_MESSAGES.NOT_FOUND);
    });
  });

  describe("deleteCapability", () => {
    let capabilityId: string;

    beforeEach(async () => {
      // Create a capability to delete
      const response = await makeRequest({
        method: "post",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities`,
        headers: { "x-api-key": validApiKey },
        data: {
          name: testSkill.name,
          level: SkillLevel.Advanced,
          type: testSkill.type,
        },
      });
      capabilityId = response.data.data.id;
    });

    it("should delete capability and decrement skill useCount", async () => {
      const response = await makeRequest({
        method: "delete",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities/${capabilityId}`,
        headers: { "x-api-key": validApiKey },
      });

      expect(response.status).toBe(200);

      // Verify capability was deleted
      const capabilityDoc = await db
        .collection(COLLECTIONS.PROFILE_CAPABILITIES)
        .doc(capabilityId)
        .get();
      expect(capabilityDoc.exists).toBe(false);

      // Verify skill useCount was decremented
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(true);
      expect(skillDoc.data()?.useCount).toBe(1);
    });

    it("should delete skill if useCount reaches 0", async () => {
      // First, delete the test skill's only capability
      await makeRequest({
        method: "delete",
        url: `${TEST_CONFIG.apiUrl}/hivemind/profiles/${profileId}/capabilities/${capabilityId}`,
        headers: { "x-api-key": validApiKey },
      });

      // Verify skill was deleted
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(false);
    });
  });
});
