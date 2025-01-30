import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ApiError } from "../../utils/error";
import { ERROR_MESSAGES } from "../../constants/api";
import { toUnixMillis } from "../../utils/timestamp";
import { skillMatchingService } from "./skillMatching.service";

import {
  Skill,
  SkillModel,
  ProfileCapability,
  ProfileCapabilityModel,
  CreateCapabilityInput,
  UpdateCapabilityInput,
  SkillLevel,
} from "../types/capability.types";

export const capabilityService = {
  async createCapability(
    profileId: string,
    input: CreateCapabilityInput,
  ): Promise<ProfileCapability> {
    console.log("[createCapability] Starting with input:", { profileId, input });
    const db = getFirestore();
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);

    try {
      // Check if profile exists
      const profileDoc = await db.collection(COLLECTIONS.PROFILES).doc(profileId).get();
      if (!profileDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
      }

      // Validate skill level
      if (!Object.values(SkillLevel).includes(input.level)) {
        throw new ApiError(400, ERROR_MESSAGES.INVALID_SKILL_LEVEL);
      }

      // Analyze skill and find similar skills
      const analysis = await skillMatchingService.analyzeSkill({
        description: `${input.name}${input.description ? ` - ${input.description}` : ""}`,
      });

      // Use suggested type and category from analysis if not provided
      const type = input.type || analysis.suggestedType;
      const category = input.category || analysis.suggestedCategory;
      if (!type) {
        throw new ApiError(400, `${ERROR_MESSAGES.INVALID_INPUT}: Could not determine skill type`);
      }

      // Check if skill already exists
      const existingSkills = await skillsCollection
        .where("name", "==", input.name)
        .where("type", "==", type)
        .limit(1)
        .get();

      let skillId: string;
      const now = Timestamp.now();

      if (existingSkills.empty) {
        // Create new skill
        const skillRef = skillsCollection.doc();
        const skill: SkillModel = {
          id: skillRef.id,
          name: input.name,
          type,
          category,
          description: input.description,
          keywords: analysis.extractedKeywords,
          aliases: input.aliases || [],
          parentType: analysis.parentType,
          useCount: 1,
          createdAt: now,
          updatedAt: now,
        };
        await skillRef.set(skill);
        skillId = skillRef.id;
      } else {
        // Use existing skill and increment useCount
        const existingSkill = existingSkills.docs[0];
        skillId = existingSkill.id;
        await existingSkill.ref.update({
          useCount: (existingSkill.data() as SkillModel).useCount + 1,
          updatedAt: now,
        });
      }

      // Check if user already has this skill
      const existingCapability = await profileCapabilitiesCollection
        .where("profileId", "==", profileId)
        .where("skillId", "==", skillId)
        .limit(1)
        .get();

      if (!existingCapability.empty) {
        throw new ApiError(400, ERROR_MESSAGES.CAPABILITY_EXISTS);
      }

      // Create profile capability
      const capabilityRef = profileCapabilitiesCollection.doc();
      const capability: ProfileCapabilityModel = {
        id: capabilityRef.id,
        profileId,
        skillId,
        level: input.level,
        isVerified: false,
        createdAt: now,
        updatedAt: now,
      };

      console.log("[createCapability] Creating new capability:", { id: capability.id });
      await capabilityRef.set(capability);

      return {
        ...capability,
        createdAt: toUnixMillis(capability.createdAt),
        updatedAt: toUnixMillis(capability.updatedAt),
        verifiedAt: capability.verifiedAt ? toUnixMillis(capability.verifiedAt) : undefined,
      };
    } catch (error) {
      console.error("[createCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
        input,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      // If skill analysis fails, return a clear error
      if (error instanceof Error && error.message.includes("Gemini")) {
        throw new ApiError(
          503,
          "Skill analysis service is temporarily unavailable. Please try again later.",
        );
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async getCapability(capabilityId: string): Promise<ProfileCapability & Skill> {
    console.log("[getCapability] Starting with id:", capabilityId);
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    try {
      const capabilityDoc = await profileCapabilitiesCollection.doc(capabilityId).get();
      if (!capabilityDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const capability = capabilityDoc.data() as ProfileCapabilityModel;
      const skillDoc = await skillsCollection.doc(capability.skillId).get();

      if (!skillDoc.exists) {
        throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
      }

      const skill = skillDoc.data() as SkillModel;

      return {
        ...capability,
        ...skill,
        createdAt: toUnixMillis(capability.createdAt),
        updatedAt: toUnixMillis(capability.updatedAt),
        verifiedAt: capability.verifiedAt ? toUnixMillis(capability.verifiedAt) : undefined,
      };
    } catch (error) {
      console.error("[getCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        capabilityId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async getCapabilities(profileId: string): Promise<Array<ProfileCapability & Skill>> {
    console.log("[getCapabilities] Starting with profileId:", profileId);
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    try {
      const capabilitiesSnapshot = await profileCapabilitiesCollection
        .where("profileId", "==", profileId)
        .get();

      console.log("[getCapabilities] Found capabilities:", { count: capabilitiesSnapshot.size });

      const capabilities = await Promise.all(
        capabilitiesSnapshot.docs.map(async (doc) => {
          const capability = doc.data() as ProfileCapabilityModel;
          const skillDoc = await skillsCollection.doc(capability.skillId).get();

          if (!skillDoc.exists) {
            throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
          }

          const skill = skillDoc.data() as SkillModel;

          return {
            ...capability,
            ...skill,
            createdAt: toUnixMillis(capability.createdAt),
            updatedAt: toUnixMillis(capability.updatedAt),
            verifiedAt: capability.verifiedAt ? toUnixMillis(capability.verifiedAt) : undefined,
          };
        }),
      );

      return capabilities;
    } catch (error) {
      console.error("[getCapabilities] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async updateCapability(
    profileId: string,
    capabilityId: string,
    input: UpdateCapabilityInput,
  ): Promise<ProfileCapability & Skill> {
    console.log("[updateCapability] Starting with:", { profileId, capabilityId, input });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    try {
      // Validate skill level if provided
      if (input.level && !Object.values(SkillLevel).includes(input.level)) {
        throw new ApiError(400, ERROR_MESSAGES.INVALID_SKILL_LEVEL);
      }

      const capabilityRef = profileCapabilitiesCollection.doc(capabilityId);
      const capabilityDoc = await capabilityRef.get();

      if (!capabilityDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const capability = capabilityDoc.data() as ProfileCapabilityModel;
      if (capability.profileId !== profileId) {
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }

      const skillDoc = await skillsCollection.doc(capability.skillId).get();
      if (!skillDoc.exists) {
        throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
      }

      const skill = skillDoc.data() as SkillModel;

      // If name or description is being updated, reanalyze the skill
      if (input.name || input.description) {
        const analysis = await skillMatchingService.analyzeSkill({
          description: `${input.name || skill.name}${
            input.description || skill.description
              ? ` - ${input.description || skill.description}`
              : ""
          }`,
        });

        // Update type and category if not explicitly provided
        if (!input.type) input.type = analysis.suggestedType;
        if (!input.category) input.category = analysis.suggestedCategory;
        if (!input.keywords) input.keywords = analysis.extractedKeywords;
        if (!input.parentType) input.parentType = analysis.parentType;

        // Update the skill document
        await skillDoc.ref.update({
          name: input.name || skill.name,
          type: input.type || skill.type,
          category: input.category || skill.category,
          description: input.description || skill.description,
          keywords: input.keywords || skill.keywords,
          parentType: input.parentType || skill.parentType,
          updatedAt: Timestamp.now(),
        });
      }

      // Update the profile capability
      const now = Timestamp.now();
      const capabilityUpdates = {
        level: input.level,
        updatedAt: now,
      };

      console.log("[updateCapability] Updating capability:", { id: capabilityId });
      await capabilityRef.update(capabilityUpdates);

      // Get the updated documents
      const [updatedCapability, updatedSkill] = await Promise.all([
        capabilityRef.get(),
        skillDoc.ref.get(),
      ]);

      const updatedCapabilityData = updatedCapability.data() as ProfileCapabilityModel;
      const updatedSkillData = updatedSkill.data() as SkillModel;

      return {
        ...updatedCapabilityData,
        ...updatedSkillData,
        createdAt: toUnixMillis(updatedCapabilityData.createdAt),
        updatedAt: toUnixMillis(updatedCapabilityData.updatedAt),
        verifiedAt: updatedCapabilityData.verifiedAt
          ? toUnixMillis(updatedCapabilityData.verifiedAt)
          : undefined,
      };
    } catch (error) {
      console.error("[updateCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
        capabilityId,
        input,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async verifyCapability(
    capabilityId: string,
    verifierId: string,
  ): Promise<ProfileCapability & Skill> {
    console.log("[verifyCapability] Starting with:", { capabilityId, verifierId });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    try {
      const capabilityRef = profileCapabilitiesCollection.doc(capabilityId);
      const capabilityDoc = await capabilityRef.get();

      if (!capabilityDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const capability = capabilityDoc.data() as ProfileCapabilityModel;
      if (capability.isVerified) {
        throw new ApiError(400, ERROR_MESSAGES.CAPABILITY_ALREADY_VERIFIED);
      }

      const now = Timestamp.now();
      const updates = {
        id: capabilityId,
        isVerified: true,
        verifierId,
        verifiedAt: now,
        updatedAt: now,
      };

      console.log("[verifyCapability] Verifying capability:", { id: capabilityId });
      await capabilityRef.update(updates);

      // Get the updated capability document
      const updatedCapabilityDoc = await capabilityRef.get();
      const updatedCapability = {
        ...(updatedCapabilityDoc.data() as ProfileCapabilityModel),
        id: capabilityId,
      };

      const skillDoc = await skillsCollection.doc(capability.skillId).get();
      if (!skillDoc.exists) {
        throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
      }

      const skill = skillDoc.data() as SkillModel;

      return {
        ...updatedCapability,
        ...skill,
        id: capabilityId,
        createdAt: toUnixMillis(updatedCapability.createdAt),
        updatedAt: toUnixMillis(updatedCapability.updatedAt),
        verifiedAt: updatedCapability.verifiedAt
          ? toUnixMillis(updatedCapability.verifiedAt)
          : undefined,
      };
    } catch (error) {
      console.error("[verifyCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        capabilityId,
        verifierId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async deleteCapability(profileId: string, capabilityId: string): Promise<void> {
    console.log("[deleteCapability] Starting with:", { profileId, capabilityId });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    try {
      const capabilityRef = profileCapabilitiesCollection.doc(capabilityId);
      const capabilityDoc = await capabilityRef.get();

      if (!capabilityDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const capability = capabilityDoc.data() as ProfileCapabilityModel;
      if (capability.profileId !== profileId) {
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }

      // Decrement useCount on the skill
      const skillRef = skillsCollection.doc(capability.skillId);
      const skillDoc = await skillRef.get();

      if (skillDoc.exists) {
        const skill = skillDoc.data() as SkillModel;
        if (skill.useCount > 1) {
          await skillRef.update({
            useCount: skill.useCount - 1,
            updatedAt: Timestamp.now(),
          });
        } else {
          // If this was the last user with this skill, delete the skill
          await skillRef.delete();
        }
      }

      console.log("[deleteCapability] Deleting capability:", { id: capabilityId });
      await capabilityRef.delete();
    } catch (error) {
      console.error("[deleteCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
        capabilityId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Search for similar capabilities to help users find existing ones
   */
  async findSimilarCapabilities(description: string): Promise<Skill[]> {
    try {
      const analysis = await skillMatchingService.analyzeSkill({ description });
      return analysis.matches.map((match) => match.skill);
    } catch (error) {
      console.error("[findSimilarCapabilities] Error:", error);
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  /**
   * Get capability suggestions for autocomplete
   */
  async searchCapabilities(input: string, limit: number = 10): Promise<Skill[]> {
    try {
      return await skillMatchingService.searchCapabilities({
        query: input,
        limit,
      });
    } catch (error) {
      console.error("[searchCapabilities] Error:", error);
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
};
