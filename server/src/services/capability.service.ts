import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ApiError, toUnixMillis } from "../utils";
import { ERROR_MESSAGES, COLLECTIONS } from "../constants";
import { skillMatchingService } from ".";
import {
  Skill,
  ProfileCapability,
  ProfileCapabilityModel,
  CreateCapabilityInput,
  UpdateCapabilityInput,
  SkillLevel,
  CapabilityWithSkill,
} from "../schemas";

export const createCapability = async ({
  profileId,
  input,
}: {
  profileId: string;
  input: CreateCapabilityInput;
}): Promise<ProfileCapability> => {
  try {
    console.log("[createCapability] Starting with input:", { profileId, input });

    // Basic input validation
    if (!input.name || input.name.trim().length === 0) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.SKILL_NAME_REQUIRED);
    }

    if (input.name.length > 100) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.SKILL_NAME_TOO_LONG);
    }

    if (input.description && input.description.length > 500) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.SKILL_DESCRIPTION_TOO_LONG);
    }

    const db = getFirestore();
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);

    // Check if profile exists
    const profileDoc = await db.collection(COLLECTIONS.PROFILES).doc(profileId).get();
    if (!profileDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    // Validate skill level
    if (!Object.values(SkillLevel).includes(input.level)) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.INVALID_SKILL_LEVEL);
    }

    // Analyze skill and find similar skills
    const analysis = await skillMatchingService.analyzeSkill({
      description: `${input.name}${input.description ? ` - ${input.description}` : ""}`,
    });

    // Use suggested type and category from analysis if not provided
    const type = input.type || analysis.suggestedType;
    const category = input.category || analysis.suggestedCategory;
    if (!type) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.INVALID_INPUT);
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
      const skill: Skill = {
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
        useCount: (existingSkill.data() as Skill).useCount + 1,
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
      throw ApiError.from(null, 400, ERROR_MESSAGES.CAPABILITY_EXISTS);
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

    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const getCapability = async ({
  profileId,
  capabilityId,
}: {
  profileId: string;
  capabilityId: string;
}): Promise<CapabilityWithSkill> => {
  try {
    console.log("[getCapability] Starting with:", { profileId, capabilityId });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    const capabilityDoc = await profileCapabilitiesCollection.doc(capabilityId).get();
    if (!capabilityDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
    }

    const capability = capabilityDoc.data() as ProfileCapabilityModel;
    if (capability.profileId !== profileId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const skillDoc = await skillsCollection.doc(capability.skillId).get();
    if (!skillDoc.exists) {
      throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    const skill = skillDoc.data() as Skill;

    // Convert Firestore Timestamps to Unix timestamps (milliseconds)
    const response: CapabilityWithSkill = {
      // Capability fields
      id: capability.id,
      profileId: capability.profileId,
      skillId: capability.skillId,
      level: capability.level,
      isVerified: capability.isVerified,
      verifierId: capability.verifierId,
      verifiedAt: capability.verifiedAt ? toUnixMillis(capability.verifiedAt) : undefined,
      // Skill fields
      name: skill.name,
      type: skill.type,
      category: skill.category || "", // Ensure non-null for schema
      description: skill.description,
      keywords: skill.keywords || [], // Ensure non-null for schema
      aliases: skill.aliases || [], // Ensure non-null for schema
      parentType: skill.parentType,
      useCount: skill.useCount,
      // Common timestamp fields
      createdAt: toUnixMillis(capability.createdAt),
      updatedAt: toUnixMillis(capability.updatedAt),
    };

    return response;
  } catch (error) {
    console.error("[getCapability] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      profileId,
      capabilityId,
    });

    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const getCapabilities = async ({
  profileId,
}: {
  profileId: string;
}): Promise<Array<CapabilityWithSkill>> => {
  try {
    console.log("[getCapabilities] Starting with profileId:", profileId);
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    const capabilitiesSnapshot = await profileCapabilitiesCollection
      .where("profileId", "==", profileId)
      .get();

    console.log("[getCapabilities] Found capabilities:", { count: capabilitiesSnapshot.size });

    const capabilities = (await Promise.all(
      capabilitiesSnapshot.docs.map(async (doc) => {
        const capability = doc.data() as ProfileCapabilityModel;
        const skillDoc = await skillsCollection.doc(capability.skillId).get();

        if (!skillDoc.exists) {
          throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
        }

        const skill = skillDoc.data() as Skill;

        return {
          ...capability,
          ...skill,
          createdAt: toUnixMillis(capability.createdAt),
          updatedAt: toUnixMillis(capability.updatedAt),
          verifiedAt: capability.verifiedAt ? toUnixMillis(capability.verifiedAt) : undefined,
        };
      }),
    )) as Array<CapabilityWithSkill>;

    return capabilities;
  } catch (error) {
    console.error("[getCapabilities] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      profileId,
    });

    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const updateCapability = async ({
  profileId,
  capabilityId,
  input,
}: {
  profileId: string;
  capabilityId: string;
  input: UpdateCapabilityInput;
}): Promise<CapabilityWithSkill> => {
  try {
    console.log("[updateCapability] Starting with:", { profileId, capabilityId, input });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    // Validate skill level if provided
    if (input.level && !Object.values(SkillLevel).includes(input.level)) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.INVALID_SKILL_LEVEL);
    }

    const capabilityRef = profileCapabilitiesCollection.doc(capabilityId);
    const capabilityDoc = await capabilityRef.get();

    if (!capabilityDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
    }

    const capability = capabilityDoc.data() as ProfileCapabilityModel;
    if (capability.profileId !== profileId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const skillDoc = await skillsCollection.doc(capability.skillId).get();
    if (!skillDoc.exists) {
      throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    const skill = skillDoc.data() as Skill;

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
    const updatedSkillData = updatedSkill.data() as Skill;

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
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const verifyCapability = async ({
  capabilityId,
  verifierId,
}: {
  capabilityId: string;
  verifierId: string;
}): Promise<CapabilityWithSkill> => {
  try {
    console.log("[verifyCapability] Starting with:", { capabilityId, verifierId });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    const capabilityRef = profileCapabilitiesCollection.doc(capabilityId);
    const capabilityDoc = await capabilityRef.get();

    if (!capabilityDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
    }

    const capability = capabilityDoc.data() as ProfileCapabilityModel;
    if (capability.isVerified) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.CAPABILITY_ALREADY_VERIFIED);
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
      throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    const skill = skillDoc.data() as Skill;

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
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const deleteCapability = async ({
  profileId,
  capabilityId,
}: {
  profileId: string;
  capabilityId: string;
}): Promise<void> => {
  try {
    console.log("[deleteCapability] Starting with:", { profileId, capabilityId });
    const db = getFirestore();
    const profileCapabilitiesCollection = db.collection(COLLECTIONS.PROFILE_CAPABILITIES);
    const skillsCollection = db.collection(COLLECTIONS.SKILLS);

    const capabilityRef = profileCapabilitiesCollection.doc(capabilityId);
    const capabilityDoc = await capabilityRef.get();

    if (!capabilityDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
    }

    const capability = capabilityDoc.data() as ProfileCapabilityModel;
    if (capability.profileId !== profileId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    // Decrement useCount on the skill
    const skillRef = skillsCollection.doc(capability.skillId);
    const skillDoc = await skillRef.get();

    if (skillDoc.exists) {
      const skill = skillDoc.data() as Skill;
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
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Search for similar capabilities to help users find existing ones
 */
export const findSimilarCapabilities = async (description: string): Promise<Skill[]> => {
  try {
    const analysis = await skillMatchingService.analyzeSkill({ description });
    return analysis.matches.map((match) => match.skill);
  } catch (error) {
    console.error("[findSimilarCapabilities] Error:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get capability suggestions for autocomplete
 */
export const searchCapabilities = async (input: string, limit: number = 10): Promise<Skill[]> => {
  try {
    return await skillMatchingService.searchCapabilities({
      query: input,
      limit,
    });
  } catch (error) {
    console.error("[searchCapabilities] Error:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
