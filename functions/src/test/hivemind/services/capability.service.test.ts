import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../constants/collections";
import { cleanDatabase } from "../../utils/testUtils";
import { capabilityService } from "../../../hivemind/services/capability.service";
import { profileService } from "../../../hivemind/services/profile.service";
import { ERROR_MESSAGES } from "../../../constants/api";
import { toUnixMillis } from "../../../utils/timestamp";
import {
  SkillLevel,
  SkillModel,
  ProfileCapabilityModel,
} from "../../../hivemind/types/capability.types";
import { skillMatchingService } from "../../../hivemind/services/skillMatching.service";

describe("CapabilityService", () => {
  const db = getFirestore();
  const testWalletAddress = "0x123...";
  const testFingerprintId = "test-fingerprint-id";
  let testProfileId: string;
  let testSkill: SkillModel;
  let testProfileCapability: ProfileCapabilityModel;
  let skillRef: FirebaseFirestore.DocumentReference;
  let capabilityRef: FirebaseFirestore.DocumentReference;
  let analyzeSkillSpy: jest.SpyInstance;

  beforeEach(async () => {
    await cleanDatabase();

    // Create a test profile first (following the proper flow)
    const profile = await profileService.createProfile({
      walletAddress: testWalletAddress,
      username: "test-user",
      fingerprintId: testFingerprintId,
      bio: "Test bio",
      preferences: {
        isProfilePublic: true,
        showStats: true,
      },
    });
    testProfileId = profile.id;

    // Create test skill with auto-generated ID
    skillRef = db.collection(COLLECTIONS.SKILLS).doc();
    testSkill = {
      id: skillRef.id,
      name: "Full-stack Development",
      type: "Development",
      category: "Web Development",
      description: "Full-stack development with focus on Node.js and React",
      keywords: ["javascript", "node", "react", "fullstack"],
      aliases: ["Full Stack Development", "Full-Stack"],
      parentType: "Software Development",
      useCount: 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Create test capability with auto-generated ID
    capabilityRef = db.collection(COLLECTIONS.PROFILE_CAPABILITIES).doc();
    testProfileCapability = {
      id: capabilityRef.id,
      profileId: testProfileId,
      skillId: testSkill.id,
      level: SkillLevel.Advanced,
      isVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Add test skill and capability
    await skillRef.set(testSkill);
    await capabilityRef.set({
      ...testProfileCapability,
      id: capabilityRef.id, // Ensure ID is set in Firestore
    });

    // Setup spy
    analyzeSkillSpy = jest.spyOn(skillMatchingService, "analyzeSkill");
  });

  afterEach(async () => {
    await cleanDatabase();
    jest.restoreAllMocks();
  });

  describe("createCapability", () => {
    it("should create a capability for a profile with a new skill using LLM analysis", async () => {
      // Mock the skill analysis response
      analyzeSkillSpy.mockResolvedValueOnce({
        matches: [],
        suggestedType: "Development",
        suggestedCategory: "Web Development",
        extractedKeywords: ["python", "django", "fastapi"],
        parentType: "Software Development",
      });

      const input = {
        name: "Python Development",
        level: SkillLevel.Advanced,
        type: "Development" as const,
        description: "Python development with focus on Django and FastAPI",
      };

      const capability = await capabilityService.createCapability(testProfileId, input);

      // Verify the capability was created with the input values
      expect(capability).toBeDefined();
      expect(capability.level).toBe(input.level);
      expect(capability.isVerified).toBe(false);

      // Get the created skill to verify its properties
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(capability.skillId).get();
      expect(skillDoc.exists).toBe(true);
      const skillData = skillDoc.data() as SkillModel;
      expect(skillData.name).toBe(input.name);
      expect(skillData.type).toBe(input.type);
      expect(skillData.description).toBe(input.description);

      // Verify the mock was called with the right input
      expect(analyzeSkillSpy).toHaveBeenCalledWith({
        description: `${input.name}${input.description ? ` - ${input.description}` : ""}`,
      });

      // Clean up mock
      analyzeSkillSpy.mockRestore();
    });

    it("should create a new capability even when similar skills exist", async () => {
      // Mock the skill matching service to return a high confidence match
      analyzeSkillSpy.mockResolvedValueOnce({
        matches: [
          {
            skill: {
              id: testSkill.id,
              name: testSkill.name,
              type: testSkill.type,
              useCount: 1,
              createdAt: toUnixMillis(Timestamp.now()),
              updatedAt: toUnixMillis(Timestamp.now()),
            },
            confidence: 0.95,
            matchedOn: {
              name: true,
              aliases: true,
              keywords: true,
              category: true,
            },
          },
        ],
        suggestedType: "Development",
        suggestedCategory: "Web Development",
        extractedKeywords: ["python", "django", "fastapi"],
        parentType: "Software Development",
      });

      // Try to create a similar but not exactly matching capability
      const input = {
        name: "Fullstack Dev", // Different name but semantically similar
        level: SkillLevel.Expert,
        type: "Development" as const,
        description: "Full stack development focusing on Node.js and React", // Similar description
      };

      const capability = await capabilityService.createCapability(testProfileId, input);

      // Verify the capability was created with the input values
      expect(capability).toBeDefined();
      expect(capability.level).toBe(input.level);
      expect(capability.isVerified).toBe(false);
      expect(capability.profileId).toBe(testProfileId);

      // Get the created skill to verify its properties
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(capability.skillId).get();
      expect(skillDoc.exists).toBe(true);
      const skillData = skillDoc.data() as SkillModel;
      expect(skillData.name).toBe(input.name);
      expect(skillData.type).toBe(input.type);
      expect(skillData.description).toBe(input.description);

      // Verify the mock was called with the right input
      expect(analyzeSkillSpy).toHaveBeenCalledWith({
        description: `${input.name}${input.description ? ` - ${input.description}` : ""}`,
      });

      // Clean up mock
      analyzeSkillSpy.mockRestore();
    });

    it("should create a capability using an existing skill", async () => {
      // Create another profile first
      const otherProfile = await profileService.createProfile({
        walletAddress: "0x456...",
        username: "other-user",
        fingerprintId: "other-fingerprint-id",
        bio: "Other bio",
        preferences: { isProfilePublic: true, showStats: true },
      });

      const input = {
        name: testSkill.name,
        level: SkillLevel.Expert,
        type: testSkill.type,
        description: testSkill.description,
      };

      const capability = await capabilityService.createCapability(otherProfile.id, input);

      // Verify the existing skill was used
      expect(capability.skillId).toBe(testSkill.id);

      // Verify useCount was incremented
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(true);
      expect((skillDoc.data() as SkillModel).useCount).toBe(2);
    });

    it("should throw error if capability already exists for profile", async () => {
      const input = {
        name: testSkill.name,
        level: SkillLevel.Advanced,
        type: testSkill.type,
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.CAPABILITY_EXISTS,
      );
    });

    it("should throw error if profile does not exist", async () => {
      const input = {
        name: "New Skill",
        level: SkillLevel.Advanced,
        type: "Development",
      };

      await expect(
        capabilityService.createCapability("non-existent-profile", input),
      ).rejects.toThrow(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    });

    it("should throw error if skill name is empty", async () => {
      const input = {
        name: "",
        level: SkillLevel.Advanced,
        type: "Development" as const,
        description: "Some description",
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.INTERNAL_ERROR,
      );
    });

    it("should throw error if skill name is too long", async () => {
      const input = {
        name: "a".repeat(101),
        level: SkillLevel.Advanced,
        type: "Development" as const,
        description: "Some description",
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.INTERNAL_ERROR,
      );
    });

    it("should throw error if description is too long", async () => {
      const input = {
        name: "Valid Name",
        level: SkillLevel.Advanced,
        type: "Development" as const,
        description: "a".repeat(1001),
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.INTERNAL_ERROR,
      );
    });

    it("should throw error if skill level is invalid", async () => {
      const input = {
        name: "Valid Name",
        level: "InvalidLevel" as SkillLevel,
        type: "Development" as const,
        description: "Some description",
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.INVALID_SKILL_LEVEL,
      );
    });
  });

  describe("getCapabilities", () => {
    it("should get all capabilities for a profile", async () => {
      const capabilities = await capabilityService.getCapabilities(testProfileId);

      expect(capabilities).toHaveLength(1);
      const capability = capabilities[0];

      // Don't compare IDs directly, just ensure they exist
      expect(capability.id).toBeDefined();
      expect(typeof capability.id).toBe("string");

      // Check relationships
      expect(capability.profileId).toBe(testProfileId);
      expect(capability.skillId).toBe(testSkill.id);

      // Check skill data
      expect(capability.name).toBe(testSkill.name);
      expect(capability.type).toBe(testSkill.type);
      expect(capability.level).toBe(SkillLevel.Advanced);
      expect(capability.isVerified).toBe(false);
    });

    it("should return empty array if no capabilities found", async () => {
      const capabilities = await capabilityService.getCapabilities("non-existent-profile");
      expect(capabilities).toEqual([]);
    });

    it("should get all capabilities for a profile in batches", async () => {
      // Create 10 more capabilities for testing
      const capabilities: ProfileCapabilityModel[] = [];
      for (let i = 0; i < 10; i++) {
        const skillRef = db.collection(COLLECTIONS.SKILLS).doc();
        const skill: SkillModel = {
          id: skillRef.id,
          name: `Skill ${i}`,
          type: "Development",
          category: "Web Development",
          description: `Description ${i}`,
          keywords: ["test"],
          aliases: [],
          parentType: "Software Development",
          useCount: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await skillRef.set(skill);

        const capabilityRef = db.collection(COLLECTIONS.PROFILE_CAPABILITIES).doc();
        const capability: ProfileCapabilityModel = {
          id: capabilityRef.id,
          profileId: testProfileId,
          skillId: skillRef.id,
          level: SkillLevel.Advanced,
          isVerified: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await capabilityRef.set(capability);
        capabilities.push(capability);
      }

      // Get all capabilities (should return all since we have 11 total including the test capability)
      const allCapabilities = await capabilityService.getCapabilities(testProfileId);
      expect(allCapabilities.length).toBe(11);
    });

    it("should get capabilities filtered by verification status", async () => {
      // Create a verified capability
      const verifiedSkillRef = db.collection(COLLECTIONS.SKILLS).doc();
      const verifiedSkill: SkillModel = {
        id: verifiedSkillRef.id,
        name: "Verified Skill",
        type: "Development",
        category: "Web Development",
        description: "A verified skill",
        keywords: ["test"],
        aliases: [],
        parentType: "Software Development",
        useCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await verifiedSkillRef.set(verifiedSkill);

      const verifiedCapabilityRef = db.collection(COLLECTIONS.PROFILE_CAPABILITIES).doc();
      const verifiedCapability: ProfileCapabilityModel = {
        id: verifiedCapabilityRef.id,
        profileId: testProfileId,
        skillId: verifiedSkillRef.id,
        level: SkillLevel.Advanced,
        isVerified: true,
        verifierId: "test-verifier",
        verifiedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await verifiedCapabilityRef.set(verifiedCapability);

      // Get all capabilities
      const allCapabilities = await capabilityService.getCapabilities(testProfileId);

      // Check that we have both verified and unverified capabilities
      const verifiedCapabilities = allCapabilities.filter((cap) => cap.isVerified);
      const unverifiedCapabilities = allCapabilities.filter((cap) => !cap.isVerified);

      expect(verifiedCapabilities.length).toBeGreaterThan(0);
      expect(unverifiedCapabilities.length).toBeGreaterThan(0);
    });
  });

  describe("updateCapability", () => {
    it("should update a capability", async () => {
      const updates = {
        level: SkillLevel.Expert,
        description: "Updated description",
      };

      const updated = await capabilityService.updateCapability(
        testProfileId,
        testProfileCapability.id,
        updates,
      );

      // Check the update worked but don't compare IDs directly
      expect(updated).toBeDefined();
      expect(updated.profileId).toBe(testProfileId);
      expect(updated.skillId).toBe(testSkill.id);
      expect(updated.level).toBe(updates.level);
      expect(updated.description).toBe(updates.description);

      // Verify skill was updated
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(true);
      expect((skillDoc.data() as SkillModel).description).toBe(updates.description);

      // Verify profile capability was updated
      const capabilityDoc = await db
        .collection(COLLECTIONS.PROFILE_CAPABILITIES)
        .doc(testProfileCapability.id)
        .get();
      expect(capabilityDoc.exists).toBe(true);
      expect((capabilityDoc.data() as ProfileCapabilityModel).level).toBe(updates.level);
    });

    it("should throw error if capability not found", async () => {
      await expect(
        capabilityService.updateCapability(testProfileId, "non-existent-id", {
          level: SkillLevel.Expert,
        }),
      ).rejects.toThrow(ERROR_MESSAGES.NOT_FOUND);
    });

    it("should throw error if trying to update another profile's capability", async () => {
      await expect(
        capabilityService.updateCapability("different-profile", testProfileCapability.id, {
          level: SkillLevel.Expert,
        }),
      ).rejects.toThrow(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe("deleteCapability", () => {
    it("should delete a capability and decrement skill useCount", async () => {
      // First create another capability using the same skill
      const otherCapabilityRef = db.collection(COLLECTIONS.PROFILE_CAPABILITIES).doc();
      const otherCapability: ProfileCapabilityModel = {
        id: otherCapabilityRef.id,
        profileId: "other-profile",
        skillId: testSkill.id,
        level: SkillLevel.Expert,
        isVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await otherCapabilityRef.set(otherCapability);

      // Update skill useCount to reflect the additional capability
      await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).update({
        useCount: 2,
      });

      // Delete one capability
      await capabilityService.deleteCapability(testProfileId, testProfileCapability.id);

      // Verify capability was deleted
      const capabilityDoc = await db
        .collection(COLLECTIONS.PROFILE_CAPABILITIES)
        .doc(testProfileCapability.id)
        .get();
      expect(capabilityDoc.exists).toBe(false);

      // Verify skill still exists with decremented useCount
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(true);
      expect((skillDoc.data() as SkillModel).useCount).toBe(1);
    });

    it("should delete the skill if it was the last user", async () => {
      // First delete the existing capability
      await capabilityService.deleteCapability(testProfileId, testProfileCapability.id);

      // Verify skill was deleted since useCount reached 0
      const skillDoc = await db.collection(COLLECTIONS.SKILLS).doc(testSkill.id).get();
      expect(skillDoc.exists).toBe(false);
    });

    it("should throw error if capability not found", async () => {
      await expect(
        capabilityService.deleteCapability(testProfileId, "non-existent-id"),
      ).rejects.toThrow(ERROR_MESSAGES.NOT_FOUND);
    });

    it("should throw error if trying to delete another profile's capability", async () => {
      await expect(
        capabilityService.deleteCapability("different-profile", testProfileCapability.id),
      ).rejects.toThrow(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe("verifyCapability", () => {
    it("should verify a capability", async () => {
      const verifierId = "verifier-id";

      const verified = await capabilityService.verifyCapability(
        testProfileCapability.id,
        verifierId,
      );

      // Check that we got a capability back
      expect(verified).toBeDefined();
      expect(verified.id).toBe(testProfileCapability.id);

      // Check the capability properties
      expect(verified.profileId).toBe(testProfileId);
      expect(verified.skillId).toBe(testSkill.id);
      expect(verified.isVerified).toBe(true);
      expect(verified.verifierId).toBe(verifierId);

      // Verify the capability was updated in the database
      const capabilityDoc = await db
        .collection(COLLECTIONS.PROFILE_CAPABILITIES)
        .doc(testProfileCapability.id)
        .get();
      expect(capabilityDoc.exists).toBe(true);
      expect((capabilityDoc.data() as ProfileCapabilityModel).isVerified).toBe(true);
      expect((capabilityDoc.data() as ProfileCapabilityModel).verifierId).toBe(verifierId);
    });

    it("should throw error if capability already verified", async () => {
      // First verify the capability
      await db.collection(COLLECTIONS.PROFILE_CAPABILITIES).doc(testProfileCapability.id).update({
        isVerified: true,
        verifierId: "verifier-1",
        verifiedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Try to verify again
      await expect(
        capabilityService.verifyCapability(testProfileCapability.id, "verifier-2"),
      ).rejects.toThrow(ERROR_MESSAGES.CAPABILITY_ALREADY_VERIFIED);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle skill matching service failure gracefully", async () => {
      // Mock skill matching service to throw an error
      analyzeSkillSpy.mockRejectedValueOnce(new Error("Service unavailable"));

      const input = {
        name: "New Skill",
        level: SkillLevel.Advanced,
        type: "Development" as const,
        description: "Test description",
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.INTERNAL_ERROR,
      );
    });

    it("should handle concurrent capability creation", async () => {
      analyzeSkillSpy.mockResolvedValue({
        matches: [],
        suggestedType: "Development",
        suggestedCategory: "Web Development",
        extractedKeywords: ["test"],
        parentType: "Software Development",
      });

      const input = {
        name: "Concurrent Skill",
        level: SkillLevel.Advanced,
        type: "Development" as const,
        description: "Test description",
      };

      // Start both operations simultaneously
      const results = await Promise.allSettled([
        capabilityService.createCapability(testProfileId, input),
        capabilityService.createCapability(testProfileId, input),
      ]);

      // Both should succeed since they're creating separate capabilities
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);

      // Verify we have two capabilities with the same name but different IDs
      const capabilities = await capabilityService.getCapabilities(testProfileId);
      const concurrentCapabilities = capabilities.filter((c) => c.name === input.name);
      expect(concurrentCapabilities.length).toBe(2);
      expect(new Set(concurrentCapabilities.map((c) => c.id)).size).toBe(2);
    });

    it("should handle concurrent capability updates", async () => {
      // Create two separate update operations
      const update1 = capabilityService.updateCapability(testProfileId, testProfileCapability.id, {
        level: SkillLevel.Expert,
      });
      const update2 = capabilityService.updateCapability(testProfileId, testProfileCapability.id, {
        level: SkillLevel.Intermediate,
      });

      // Execute them concurrently
      const results = await Promise.allSettled([update1, update2]);

      // Both should succeed as they're atomic operations
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);

      // The final state should be one of the two updates
      const capability = (
        await db.collection(COLLECTIONS.PROFILE_CAPABILITIES).doc(testProfileCapability.id).get()
      ).data() as ProfileCapabilityModel;

      expect([SkillLevel.Expert, SkillLevel.Intermediate]).toContain(capability.level);
    });
  });
});
