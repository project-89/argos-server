import { ApiError } from "../utils";
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
import { getDb, formatDocument, formatDocuments, toObjectId } from "../utils/mongodb";

const LOG_PREFIX = "[Capability Service]";

export const createCapability = async ({
  profileId,
  input,
}: {
  profileId: string;
  input: CreateCapabilityInput;
}): Promise<ProfileCapability> => {
  try {
    console.log(`${LOG_PREFIX} Starting with input:`, { profileId, input });

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

    const db = await getDb();

    // Check if profile exists
    const profile = await db.collection(COLLECTIONS.PROFILES).findOne({ id: profileId });
    if (!profile) {
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
    const existingSkill = await db.collection(COLLECTIONS.SKILLS).findOne({
      name: input.name,
      type: type,
    });

    let skillId: string;
    const now = new Date();

    if (!existingSkill) {
      // Create new skill
      const skill: Skill = {
        id: crypto.randomUUID(),
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

      await db.collection(COLLECTIONS.SKILLS).insertOne(skill);
      skillId = skill.id;
    } else {
      // Use existing skill and increment useCount
      skillId = existingSkill.id;
      await db.collection(COLLECTIONS.SKILLS).updateOne(
        { id: skillId },
        {
          $inc: { useCount: 1 },
          $set: { updatedAt: now },
        },
      );
    }

    // Check if user already has this skill
    const existingCapability = await db.collection(COLLECTIONS.PROFILE_CAPABILITIES).findOne({
      profileId,
      skillId,
    });

    if (existingCapability) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.CAPABILITY_EXISTS);
    }

    // Create profile capability
    const capability: ProfileCapabilityModel = {
      id: crypto.randomUUID(),
      profileId,
      skillId,
      level: input.level,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    console.log(`${LOG_PREFIX} Creating new capability:`, { id: capability.id });
    await db.collection(COLLECTIONS.PROFILE_CAPABILITIES).insertOne(capability);

    return {
      ...capability,
      createdAt: capability.createdAt.getTime(),
      updatedAt: capability.updatedAt.getTime(),
      verifiedAt: capability.verifiedAt ? capability.verifiedAt.getTime() : undefined,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
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
    console.log(`${LOG_PREFIX} Starting with:`, { profileId, capabilityId });
    const db = await getDb();

    const capability = await db
      .collection(COLLECTIONS.PROFILE_CAPABILITIES)
      .findOne({ id: capabilityId });
    if (!capability) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
    }

    if (capability.profileId !== profileId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const skill = await db.collection(COLLECTIONS.SKILLS).findOne({ id: capability.skillId });
    if (!skill) {
      throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    // Convert Dates to Unix timestamps (milliseconds)
    const response: CapabilityWithSkill = {
      // Capability fields
      id: capability.id,
      profileId: capability.profileId,
      skillId: capability.skillId,
      level: capability.level,
      isVerified: capability.isVerified,
      verifierId: capability.verifierId,
      verifiedAt: capability.verifiedAt ? capability.verifiedAt.getTime() : undefined,
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
      createdAt: capability.createdAt.getTime(),
      updatedAt: capability.updatedAt.getTime(),
    };

    return response;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
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
    console.log(`${LOG_PREFIX} Starting with profileId:`, profileId);
    const db = await getDb();

    const capabilities = await db
      .collection(COLLECTIONS.PROFILE_CAPABILITIES)
      .find({ profileId })
      .toArray();

    console.log(`${LOG_PREFIX} Found capabilities:`, { count: capabilities.length });

    if (capabilities.length === 0) {
      return [];
    }

    // Get all skill IDs from capabilities
    const skillIds = capabilities.map((cap) => cap.skillId);

    // Fetch all skills in one query
    const skills = await db
      .collection(COLLECTIONS.SKILLS)
      .find({ id: { $in: skillIds } })
      .toArray();

    // Create a map of skills by ID for faster lookups
    const skillMap = new Map();
    skills.forEach((skill) => skillMap.set(skill.id, skill));

    // Combine capabilities with their corresponding skills
    const result = capabilities.map((capability) => {
      const skill = skillMap.get(capability.skillId);

      if (!skill) {
        console.error(`${LOG_PREFIX} Missing skill for capability:`, {
          capabilityId: capability.id,
          skillId: capability.skillId,
        });
        throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
      }

      return {
        ...capability,
        ...skill,
        createdAt: capability.createdAt.getTime(),
        updatedAt: capability.updatedAt.getTime(),
        verifiedAt: capability.verifiedAt ? capability.verifiedAt.getTime() : undefined,
      };
    });

    return result as Array<CapabilityWithSkill>;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
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
    console.log(`${LOG_PREFIX} Starting update:`, { profileId, capabilityId, input });
    const db = await getDb();

    // Start a session for transaction
    const session = db.client.startSession();

    try {
      let result: CapabilityWithSkill;

      await session.withTransaction(async () => {
        // Get the capability
        const capability = await db
          .collection(COLLECTIONS.PROFILE_CAPABILITIES)
          .findOne({ id: capabilityId }, { session });

        if (!capability) {
          throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
        }

        if (capability.profileId !== profileId) {
          throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
        }

        // Get the skill
        const skill = await db
          .collection(COLLECTIONS.SKILLS)
          .findOne({ id: capability.skillId }, { session });

        if (!skill) {
          throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
        }

        const now = new Date();
        const updates: Record<string, any> = { updatedAt: now };
        const skillUpdates: Record<string, any> = { updatedAt: now };

        // Update capability fields
        if (input.level) {
          updates.level = input.level;
        }

        // Update associated skill if name, type, category, etc. are provided
        if (
          input.name ||
          input.type ||
          input.category ||
          input.description ||
          input.keywords ||
          input.parentType
        ) {
          if (input.name) skillUpdates.name = input.name;
          if (input.type) skillUpdates.type = input.type;
          if (input.category) skillUpdates.category = input.category;
          if (input.description) skillUpdates.description = input.description;
          if (input.keywords) skillUpdates.keywords = input.keywords;
          if (input.parentType) skillUpdates.parentType = input.parentType;

          // Update the skill
          await db
            .collection(COLLECTIONS.SKILLS)
            .updateOne({ id: capability.skillId }, { $set: skillUpdates }, { session });
        }

        // Update the capability
        await db
          .collection(COLLECTIONS.PROFILE_CAPABILITIES)
          .updateOne({ id: capabilityId }, { $set: updates }, { session });

        // Re-fetch the capability and skill with updates
        const updatedCapability = await db
          .collection(COLLECTIONS.PROFILE_CAPABILITIES)
          .findOne({ id: capabilityId }, { session });

        const updatedSkill = await db
          .collection(COLLECTIONS.SKILLS)
          .findOne({ id: capability.skillId }, { session });

        if (!updatedCapability || !updatedSkill) {
          throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
        }

        // Create the result
        result = {
          ...updatedCapability,
          ...updatedSkill,
          createdAt: updatedCapability.createdAt.getTime(),
          updatedAt: updatedCapability.updatedAt.getTime(),
          verifiedAt: updatedCapability.verifiedAt
            ? updatedCapability.verifiedAt.getTime()
            : undefined,
        } as CapabilityWithSkill;
      });

      return result!;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
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
    console.log(`${LOG_PREFIX} Verifying capability:`, { capabilityId, verifierId });
    const db = await getDb();

    // Start a session for transaction
    const session = db.client.startSession();

    try {
      let result: CapabilityWithSkill;

      await session.withTransaction(async () => {
        // Get the capability
        const capability = await db
          .collection(COLLECTIONS.PROFILE_CAPABILITIES)
          .findOne({ id: capabilityId }, { session });

        if (!capability) {
          throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
        }

        if (capability.isVerified) {
          console.log(`${LOG_PREFIX} Capability already verified:`, capabilityId);

          // Get the skill
          const skill = await db
            .collection(COLLECTIONS.SKILLS)
            .findOne({ id: capability.skillId }, { session });

          if (!skill) {
            throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
          }

          // Create the result
          result = {
            ...capability,
            ...skill,
            createdAt: capability.createdAt.getTime(),
            updatedAt: capability.updatedAt.getTime(),
            verifiedAt: capability.verifiedAt ? capability.verifiedAt.getTime() : undefined,
          } as CapabilityWithSkill;

          return;
        }

        const now = new Date();

        // Update the capability
        await db.collection(COLLECTIONS.PROFILE_CAPABILITIES).updateOne(
          { id: capabilityId },
          {
            $set: {
              isVerified: true,
              verifierId: verifierId,
              verifiedAt: now,
              updatedAt: now,
            },
          },
          { session },
        );

        // Get the skill
        const skill = await db
          .collection(COLLECTIONS.SKILLS)
          .findOne({ id: capability.skillId }, { session });

        if (!skill) {
          throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
        }

        // Re-fetch the capability with updates
        const updatedCapability = await db
          .collection(COLLECTIONS.PROFILE_CAPABILITIES)
          .findOne({ id: capabilityId }, { session });

        if (!updatedCapability) {
          throw ApiError.from(null, 500, ERROR_MESSAGES.INTERNAL_ERROR);
        }

        // Create the result
        result = {
          ...updatedCapability,
          ...skill,
          createdAt: updatedCapability.createdAt.getTime(),
          updatedAt: updatedCapability.updatedAt.getTime(),
          verifiedAt: updatedCapability.verifiedAt
            ? updatedCapability.verifiedAt.getTime()
            : undefined,
        } as CapabilityWithSkill;
      });

      return result!;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
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
    console.log(`${LOG_PREFIX} Deleting capability:`, { profileId, capabilityId });
    const db = await getDb();

    // Get the capability to check ownership
    const capability = await db
      .collection(COLLECTIONS.PROFILE_CAPABILITIES)
      .findOne({ id: capabilityId });

    if (!capability) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.NOT_FOUND);
    }

    if (capability.profileId !== profileId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    // Start a session for transaction
    const session = db.client.startSession();

    try {
      await session.withTransaction(async () => {
        // Delete the capability
        await db
          .collection(COLLECTIONS.PROFILE_CAPABILITIES)
          .deleteOne({ id: capabilityId }, { session });

        // Decrement the useCount on the skill
        await db.collection(COLLECTIONS.SKILLS).updateOne(
          { id: capability.skillId },
          {
            $inc: { useCount: -1 },
            $set: { updatedAt: new Date() },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    console.log(`${LOG_PREFIX} Successfully deleted capability:`, capabilityId);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      profileId,
      capabilityId,
    });

    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const findSimilarCapabilities = async (description: string): Promise<Skill[]> => {
  try {
    const analysis = await skillMatchingService.analyzeSkill({ description });
    return analysis.matches.map((match) => match.skill);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error finding similar capabilities:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_FIND_SIMILAR_SKILLS);
  }
};

export const searchCapabilities = async (input: string, limit: number = 10): Promise<Skill[]> => {
  try {
    const db = await getDb();

    // Create a text search query
    const skills = await db
      .collection(COLLECTIONS.SKILLS)
      .find({
        $or: [
          { name: { $regex: input, $options: "i" } },
          { aliases: { $elemMatch: { $regex: input, $options: "i" } } },
          { keywords: { $elemMatch: { $regex: input, $options: "i" } } },
          { description: { $regex: input, $options: "i" } },
        ],
      })
      .sort({ useCount: -1 })
      .limit(limit)
      .toArray();

    return formatDocuments(skills) as Skill[];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error searching capabilities:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_FIND_SIMILAR_SKILLS);
  }
};
