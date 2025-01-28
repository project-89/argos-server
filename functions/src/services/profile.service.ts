import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { toUnixMillis } from "../utils/timestamp";
import {
  Profile,
  ProfileModel,
  CreateProfileInput,
  UpdateProfileInput,
} from "../types/profile.types";

// Helper to remove undefined values from an object
const removeUndefined = (obj: any) => {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    } else if (result[key] instanceof Timestamp) {
      // Preserve Timestamp objects
      result[key] = result[key];
    } else if (typeof result[key] === "object" && result[key] !== null) {
      result[key] = removeUndefined(result[key]);
      if (Object.keys(result[key]).length === 0) {
        delete result[key];
      }
    }
  });
  return result;
};

export const profileService = {
  async createProfile(input: CreateProfileInput): Promise<Profile> {
    console.log("[createProfile] Starting with input:", input);
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.PROFILES);

    try {
      // Check if profile already exists with this wallet
      const existing = await collection
        .where("walletAddress", "==", input.walletAddress)
        .limit(1)
        .get();

      console.log("[createProfile] Existing check result:", { exists: !existing.empty });

      if (!existing.empty) {
        throw new ApiError(400, ERROR_MESSAGES.PROFILE_EXISTS);
      }

      // Check if username is taken
      const existingUsername = await collection
        .where("username", "==", input.username)
        .limit(1)
        .get();

      console.log("[createProfile] Username check result:", { exists: !existingUsername.empty });

      if (!existingUsername.empty) {
        throw new ApiError(400, ERROR_MESSAGES.USERNAME_TAKEN);
      }

      const now = Timestamp.now();
      const docRef = collection.doc();
      const profile: ProfileModel = {
        id: docRef.id,
        walletAddress: input.walletAddress,
        username: input.username,
        bio: input.bio || "",
        avatarUrl: input.avatarUrl || "",
        contactInfo: input.contactInfo || {},
        preferences: {
          isProfilePublic: input.preferences?.isProfilePublic ?? true,
          showStats: input.preferences?.showStats ?? true,
        },
        createdAt: now,
        updatedAt: now,
      };

      // Remove any undefined values before saving
      const cleanProfile = removeUndefined(profile);
      console.log("[createProfile] Creating new profile:", { id: profile.id });

      await docRef.set(cleanProfile);

      return {
        ...cleanProfile,
        createdAt: toUnixMillis(cleanProfile.createdAt),
        updatedAt: toUnixMillis(cleanProfile.updatedAt),
      };
    } catch (error) {
      console.error("[createProfile] Error:", {
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

  async getProfile(id: string): Promise<Profile> {
    console.log("[getProfile] Starting with id:", id);
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.PROFILES);

    try {
      const doc = await collection.doc(id).get();
      console.log("[getProfile] Document exists:", doc.exists);

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
      }

      const data = doc.data() as ProfileModel;
      return {
        ...data,
        createdAt: toUnixMillis(data.createdAt),
        updatedAt: toUnixMillis(data.updatedAt),
      };
    } catch (error) {
      console.error("[getProfile] Error:", {
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

  async getProfileByWallet(walletAddress: string): Promise<Profile> {
    console.log("[getProfileByWallet] Starting with walletAddress:", walletAddress);
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.PROFILES);

    try {
      const snapshot = await collection.where("walletAddress", "==", walletAddress).limit(1).get();
      console.log("[getProfileByWallet] Profile found:", { found: !snapshot.empty });

      if (snapshot.empty) {
        throw new ApiError(404, "Profile not found for wallet address");
      }

      const data = snapshot.docs[0].data() as ProfileModel;
      return {
        ...data,
        createdAt: toUnixMillis(data.createdAt),
        updatedAt: toUnixMillis(data.updatedAt),
      };
    } catch (error) {
      console.error("[getProfileByWallet] Error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        walletAddress,
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },

  async updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
    console.log("[updateProfile] Starting with:", { id, input });
    const db = getFirestore();
    const collection = db.collection(COLLECTIONS.PROFILES);

    try {
      const doc = await collection.doc(id).get();
      console.log("[updateProfile] Document exists:", doc.exists);

      if (!doc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
      }

      // If username is being updated, check if new username is taken
      if (input.username) {
        const existingUsername = await collection
          .where("username", "==", input.username)
          .limit(1)
          .get();

        console.log("[updateProfile] Username check result:", {
          exists: !existingUsername.empty,
          sameId: existingUsername.docs[0]?.id === id,
        });

        if (!existingUsername.empty && existingUsername.docs[0].id !== id) {
          throw new ApiError(400, ERROR_MESSAGES.USERNAME_TAKEN);
        }
      }

      const now = Timestamp.now();
      const updates = removeUndefined({
        ...input,
        updatedAt: now,
      });

      console.log("[updateProfile] Updating profile");
      await doc.ref.update(updates);

      const updatedDoc = await doc.ref.get();
      const data = updatedDoc.data() as ProfileModel;
      return {
        ...data,
        createdAt: toUnixMillis(data.createdAt),
        updatedAt: toUnixMillis(data.updatedAt),
      };
    } catch (error) {
      console.error("[updateProfile] Error:", {
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
};
