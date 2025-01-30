import { getFirestore, Timestamp, CollectionReference, Query } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ApiError } from "../../utils/error";
import { ERROR_MESSAGES } from "../../constants/api";
import { toUnixMillis } from "../../utils/timestamp";
import {
  Profile,
  ProfileModel,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileWithStats,
} from "../types/profile.types";
import { StatsModel } from "../types/stats.types";

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

      // Create profile with explicit defaults
      const profile: ProfileModel = {
        id: docRef.id,
        walletAddress: input.walletAddress,
        username: input.username,
        fingerprintId: input.fingerprintId,
        bio: input.bio ?? "", // Explicit default
        avatarUrl: input.avatarUrl ?? "", // Explicit default
        contactInfo: input.contactInfo ?? {}, // Explicit default
        preferences: {
          isProfilePublic: input.preferences?.isProfilePublic ?? true,
          showStats: input.preferences?.showStats ?? true,
        },
        createdAt: now,
        updatedAt: now,
      };

      // Use transaction to create both profile and stats
      await db.runTransaction(async (transaction) => {
        transaction.set(docRef, profile);

        // Initialize stats with explicit values
        const statsCollection = db.collection(COLLECTIONS.STATS);
        const stats: StatsModel = {
          id: profile.id,
          missionsCompleted: 0,
          successRate: 0,
          totalRewards: 0,
          reputation: 0,
          joinedAt: now,
          lastActive: now,
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(statsCollection.doc(profile.id), stats);
      });

      console.log("[createProfile] Successfully created profile and initialized stats:", {
        id: profile.id,
      });

      return {
        ...profile,
        createdAt: toUnixMillis(profile.createdAt),
        updatedAt: toUnixMillis(profile.updatedAt),
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

  async getProfile(id: string): Promise<ProfileWithStats> {
    console.log("[getProfile] Starting with id:", id);
    const db = getFirestore();
    const profileCollection = db.collection(COLLECTIONS.PROFILES);
    const statsCollection = db.collection(COLLECTIONS.STATS);

    try {
      // Get both profile and stats in parallel
      const [profileDoc, statsDoc] = await Promise.all([
        profileCollection.doc(id).get(),
        statsCollection.doc(id).get(),
      ]);

      console.log("[getProfile] Documents exist:", {
        profile: profileDoc.exists,
        stats: statsDoc.exists,
      });

      if (!profileDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
      }

      const profileData = profileDoc.data() as ProfileModel;
      const statsData = statsDoc.data() as StatsModel;

      return {
        ...profileData,
        createdAt: toUnixMillis(profileData.createdAt),
        updatedAt: toUnixMillis(profileData.updatedAt),
        stats: statsData
          ? {
              ...statsData,
              joinedAt: toUnixMillis(statsData.joinedAt),
              lastActive: toUnixMillis(statsData.lastActive),
              createdAt: toUnixMillis(statsData.createdAt),
              updatedAt: toUnixMillis(statsData.updatedAt),
            }
          : null,
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

  async getProfileByWallet(walletAddress: string): Promise<ProfileWithStats> {
    console.log("[getProfileByWallet] Starting with walletAddress:", walletAddress);
    const db = getFirestore();
    const profileCollection = db.collection(COLLECTIONS.PROFILES);

    try {
      const snapshot = await profileCollection
        .where("walletAddress", "==", walletAddress)
        .limit(1)
        .get();
      console.log("[getProfileByWallet] Profile found:", { found: !snapshot.empty });

      if (snapshot.empty) {
        throw new ApiError(404, "Profile not found for wallet address");
      }

      const profileData = snapshot.docs[0].data() as ProfileModel;
      const statsDoc = await db.collection(COLLECTIONS.STATS).doc(profileData.id).get();

      const statsData = statsDoc.data() as StatsModel;

      return {
        ...profileData,
        createdAt: toUnixMillis(profileData.createdAt),
        updatedAt: toUnixMillis(profileData.updatedAt),
        stats: statsData
          ? {
              ...statsData,
              joinedAt: toUnixMillis(statsData.joinedAt),
              lastActive: toUnixMillis(statsData.lastActive),
              createdAt: toUnixMillis(statsData.createdAt),
              updatedAt: toUnixMillis(statsData.updatedAt),
            }
          : null,
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

      // Only include fields that are actually present in the input
      const updates: Partial<ProfileModel> = {
        updatedAt: now,
      };

      // Add optional fields if they exist
      if (input.username) updates.username = input.username;
      if (input.bio) updates.bio = input.bio;
      if (input.avatarUrl) updates.avatarUrl = input.avatarUrl;
      if (input.contactInfo) updates.contactInfo = input.contactInfo;

      // Handle preferences separately to ensure type safety
      if (input.preferences) {
        const currentPrefs = (await doc.ref.get()).data()?.preferences;
        updates.preferences = {
          isProfilePublic:
            input.preferences.isProfilePublic ?? currentPrefs?.isProfilePublic ?? true,
          showStats: input.preferences.showStats ?? currentPrefs?.showStats ?? true,
        };
      }

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

  /**
   * Search for profiles based on various criteria
   */
  async searchProfiles(options: {
    query?: string;
    skillType?: string;
    minSkillLevel?: number;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ profiles: ProfileModel[]; total: number }> {
    try {
      const { query, skillType, minSkillLevel, isVerified, limit = 10, offset = 0 } = options;
      const db = getFirestore();
      const profilesRef = db.collection(COLLECTIONS.PROFILES) as CollectionReference<ProfileModel>;
      let finalQuery: Query<ProfileModel> = profilesRef;

      // Handle capability filtering
      if (skillType || minSkillLevel !== undefined || isVerified !== undefined) {
        const capabilitiesSnapshot = await db.collection(COLLECTIONS.CAPABILITIES).get();
        const eligibleProfileIds = new Set<string>();

        for (const doc of capabilitiesSnapshot.docs) {
          const capability = doc.data();
          let isEligible = true;

          if (skillType && capability.type !== skillType) {
            isEligible = false;
          }
          if (minSkillLevel !== undefined && capability.level < minSkillLevel) {
            isEligible = false;
          }
          if (isVerified !== undefined && capability.isVerified !== isVerified) {
            isEligible = false;
          }

          if (isEligible) {
            eligibleProfileIds.add(capability.profileId);
          }
        }

        if (eligibleProfileIds.size === 0) {
          return { profiles: [], total: 0 };
        }
        finalQuery = finalQuery.where("id", "in", Array.from(eligibleProfileIds));
      }

      // Add text search conditions
      if (query) {
        finalQuery = finalQuery
          .where("searchableText", ">=", query.toLowerCase())
          .where("searchableText", "<=", query.toLowerCase() + "\uf8ff");
      }

      // Get total count
      const totalSnapshot = await finalQuery.count().get();
      const total = totalSnapshot.data().count;

      // Get paginated results
      const snapshot = await finalQuery
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .offset(offset)
        .get();

      const profiles = snapshot.docs.map((doc) => doc.data());
      return { profiles, total };
    } catch (error) {
      console.error("[Profile Service] Error searching profiles:", error);
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }
  },
};
