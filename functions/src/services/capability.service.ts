import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { toUnixMillis } from "../utils/timestamp";
import {
  CapabilityModel,
  CapabilityResponse,
  CreateCapabilityInput,
  UpdateCapabilityInput,
  SkillLevel,
} from "../types/capability.types";

const validateSkillLevel = (level: any): boolean => {
  return Object.values(SkillLevel).includes(level);
};

export const capabilityService = {
  async createCapability(
    profileId: string,
    input: CreateCapabilityInput,
  ): Promise<CapabilityResponse> {
    console.log("[createCapability] Starting with input:", input);
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.CAPABILITIES);

    try {
      if (!validateSkillLevel(input.level)) {
        throw new ApiError(400, ERROR_MESSAGES.INVALID_SKILL_LEVEL);
      }

      // Check if capability already exists for this profile
      const existing = await collection
        .where("profileId", "==", profileId)
        .where("type", "==", input.type)
        .get();

      console.log("[createCapability] Existing check result:", { exists: !existing.empty });

      if (!existing.empty) {
        throw new ApiError(400, ERROR_MESSAGES.CAPABILITY_EXISTS);
      }

      const now = Timestamp.now();
      const capability: CapabilityModel = {
        id: collection.doc().id,
        profileId,
        name: input.name,
        level: input.level,
        type: input.type,
        description: input.description,
        isVerified: false,
        createdAt: now,
        updatedAt: now,
      };

      console.log("[createCapability] Creating new capability:", { id: capability.id });
      await collection.doc(capability.id).set(capability);

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
        input,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async getCapability(id: string): Promise<CapabilityResponse> {
    console.log("[getCapability] Starting with id:", id);
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.CAPABILITIES);

    try {
      const doc = await collection.doc(id).get();
      console.log("[getCapability] Document exists:", doc.exists);

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const data = doc.data() as CapabilityModel;
      return {
        ...data,
        createdAt: toUnixMillis(data.createdAt),
        updatedAt: toUnixMillis(data.updatedAt),
        verifiedAt: data.verifiedAt ? toUnixMillis(data.verifiedAt) : undefined,
      };
    } catch (error) {
      console.error("[getCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        id,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async getProfileCapabilities(profileId: string): Promise<CapabilityResponse[]> {
    console.log("[getProfileCapabilities] Starting with profileId:", profileId);
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.CAPABILITIES);

    try {
      const snapshot = await collection
        .where("profileId", "==", profileId)
        .orderBy("level", "desc")
        .get();

      console.log("[getProfileCapabilities] Found capabilities:", { count: snapshot.size });

      return snapshot.docs.map((doc) => {
        const data = doc.data() as CapabilityModel;
        return {
          ...data,
          createdAt: toUnixMillis(data.createdAt),
          updatedAt: toUnixMillis(data.updatedAt),
          verifiedAt: data.verifiedAt ? toUnixMillis(data.verifiedAt) : undefined,
        };
      });
    } catch (error) {
      console.error("[getProfileCapabilities] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        profileId,
      });
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async updateCapability(id: string, input: UpdateCapabilityInput): Promise<CapabilityResponse> {
    console.log("[updateCapability] Starting with:", { id, input });
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.CAPABILITIES);

    try {
      if (input.level && !validateSkillLevel(input.level)) {
        throw new ApiError(400, ERROR_MESSAGES.INVALID_SKILL_LEVEL);
      }

      const doc = await collection.doc(id).get();
      console.log("[updateCapability] Document exists:", doc.exists);

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const now = Timestamp.now();
      const updates = {
        ...input,
        updatedAt: now,
      };

      console.log("[updateCapability] Updating capability");
      await collection.doc(id).update(updates);
      return this.getCapability(id);
    } catch (error) {
      console.error("[updateCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        id,
        input,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async verifyCapability(id: string, verifierId: string): Promise<CapabilityResponse> {
    console.log("[verifyCapability] Starting with:", { id, verifierId });
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.CAPABILITIES);

    try {
      const doc = await collection.doc(id).get();
      console.log("[verifyCapability] Document exists:", doc.exists);

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
      }

      const data = doc.data() as CapabilityModel;
      if (data.isVerified) {
        throw new ApiError(400, ERROR_MESSAGES.CAPABILITY_ALREADY_VERIFIED);
      }

      const now = Timestamp.now();
      const updates = {
        isVerified: true,
        verifiedAt: now,
        updatedAt: now,
      };

      console.log("[verifyCapability] Updating verification status");
      await collection.doc(id).update(updates);
      return this.getCapability(id);
    } catch (error) {
      console.error("[verifyCapability] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        id,
        verifierId,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
};
