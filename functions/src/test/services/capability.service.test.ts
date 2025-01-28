import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { cleanDatabase } from "../utils/testUtils";
import { capabilityService } from "../../services/capability.service";
import { ERROR_MESSAGES } from "../../constants/api";
import { SkillLevel, SpecializationType } from "../../types/capability.types";

describe("CapabilityService", () => {
  const db = getFirestore();
  const testProfileId = "test-profile-id";
  const testVerifierId = "test-verifier-id";

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("createCapability", () => {
    it("should create a capability for a profile", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development with focus on Node.js and React",
      };

      const capability = await capabilityService.createCapability(testProfileId, input);

      expect(capability).toMatchObject({
        id: expect.any(String),
        profileId: testProfileId,
        name: input.name,
        level: input.level,
        type: input.type,
        description: input.description,
        isVerified: false,
      });
      expect(typeof capability.createdAt).toBe("number");
      expect(typeof capability.updatedAt).toBe("number");

      // Verify in database
      const doc = await db.collection(COLLECTIONS.CAPABILITIES).doc(capability.id).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data).toMatchObject({
        id: capability.id,
        profileId: testProfileId,
        name: input.name,
        level: input.level,
        type: input.type,
        description: input.description,
        isVerified: false,
      });
      expect(data?.createdAt).toBeInstanceOf(Timestamp);
      expect(data?.updatedAt).toBeInstanceOf(Timestamp);
    });

    it("should throw error if capability already exists", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      await capabilityService.createCapability(testProfileId, input);
      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.CAPABILITY_EXISTS,
      );
    });

    it("should throw error if invalid skill level", async () => {
      const input = {
        name: "Full-stack Development",
        level: "invalid" as SkillLevel,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      await expect(capabilityService.createCapability(testProfileId, input)).rejects.toThrow(
        ERROR_MESSAGES.INVALID_SKILL_LEVEL,
      );
    });
  });

  describe("getCapability", () => {
    it("should get a capability by id", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      const created = await capabilityService.createCapability(testProfileId, input);
      const capability = await capabilityService.getCapability(created.id);

      expect(capability).toMatchObject({
        id: created.id,
        profileId: testProfileId,
        name: input.name,
        level: input.level,
        type: input.type,
        description: input.description,
        isVerified: false,
      });
      expect(capability.createdAt).toBe(created.createdAt);
      expect(capability.updatedAt).toBe(created.updatedAt);
    });

    it("should throw error if capability not found", async () => {
      await expect(capabilityService.getCapability("non-existent-id")).rejects.toThrow(
        ERROR_MESSAGES.NOT_FOUND,
      );
    });
  });

  describe("getProfileCapabilities", () => {
    it("should get all capabilities for a profile", async () => {
      const input1 = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      const input2 = {
        name: "UI/UX Design",
        level: SkillLevel.Intermediate,
        type: SpecializationType.Design,
        description: "UI/UX Design",
      };

      const capability1 = await capabilityService.createCapability(testProfileId, input1);
      const capability2 = await capabilityService.createCapability(testProfileId, input2);

      const capabilities = await capabilityService.getProfileCapabilities(testProfileId);

      expect(capabilities).toHaveLength(2);
      expect(capabilities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: capability1.id,
            profileId: testProfileId,
            type: SpecializationType.Development,
            level: SkillLevel.Advanced,
          }),
          expect.objectContaining({
            id: capability2.id,
            profileId: testProfileId,
            type: SpecializationType.Design,
            level: SkillLevel.Intermediate,
          }),
        ]),
      );
    });

    it("should return empty array if no capabilities found", async () => {
      const capabilities = await capabilityService.getProfileCapabilities(testProfileId);
      expect(capabilities).toEqual([]);
    });
  });

  describe("updateCapability", () => {
    it("should update a capability", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      const created = await capabilityService.createCapability(testProfileId, input);
      const updates = {
        level: SkillLevel.Expert,
        description: "Senior Full-stack development",
      };

      const updated = await capabilityService.updateCapability(created.id, updates);

      expect(updated).toMatchObject({
        id: created.id,
        profileId: testProfileId,
        name: input.name,
        type: input.type,
        ...updates,
      });
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      // Verify in database
      const doc = await db.collection(COLLECTIONS.CAPABILITIES).doc(created.id).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data).toMatchObject({
        id: created.id,
        profileId: testProfileId,
        name: input.name,
        type: input.type,
        ...updates,
      });
    });

    it("should throw error if capability not found", async () => {
      await expect(
        capabilityService.updateCapability("non-existent-id", {
          level: SkillLevel.Expert,
        }),
      ).rejects.toThrow(ERROR_MESSAGES.NOT_FOUND);
    });

    it("should throw error if invalid skill level", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      const created = await capabilityService.createCapability(testProfileId, input);

      await expect(
        capabilityService.updateCapability(created.id, {
          level: "invalid" as SkillLevel,
        }),
      ).rejects.toThrow(ERROR_MESSAGES.INVALID_SKILL_LEVEL);
    });
  });

  describe("verifyCapability", () => {
    it("should verify a capability", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      const created = await capabilityService.createCapability(testProfileId, input);
      const verified = await capabilityService.verifyCapability(created.id, testVerifierId);

      expect(verified.isVerified).toBe(true);
      expect(verified.updatedAt).toBeGreaterThan(created.updatedAt);
      expect(typeof verified.verifiedAt).toBe("number");

      // Verify in database
      const doc = await db.collection(COLLECTIONS.CAPABILITIES).doc(created.id).get();
      expect(doc.exists).toBe(true);
      expect(doc.data()?.isVerified).toBe(true);
      expect(doc.data()?.verifiedAt).toBeInstanceOf(Timestamp);
    });

    it("should throw error if capability not found", async () => {
      await expect(
        capabilityService.verifyCapability("non-existent-id", testVerifierId),
      ).rejects.toThrow(ERROR_MESSAGES.NOT_FOUND);
    });

    it("should throw error if capability already verified", async () => {
      const input = {
        name: "Full-stack Development",
        level: SkillLevel.Advanced,
        type: SpecializationType.Development,
        description: "Full-stack development",
      };

      const created = await capabilityService.createCapability(testProfileId, input);
      await capabilityService.verifyCapability(created.id, testVerifierId);

      await expect(capabilityService.verifyCapability(created.id, testVerifierId)).rejects.toThrow(
        ERROR_MESSAGES.CAPABILITY_ALREADY_VERIFIED,
      );
    });
  });
});
