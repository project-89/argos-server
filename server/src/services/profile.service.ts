import { getFirestore, Timestamp, CollectionReference, Query } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError, toUnixMillis } from "../utils";
import {
  Profile,
  ProfileCreateRequest,
  ProfileUpdateRequest,
  ProfileResponse,
  ProfileWithStatsResponse,
  Stats,
} from "../schemas";

const LOG_PREFIX = "[Profile Service]";
const db = getFirestore();

export async function createProfile(input: ProfileCreateRequest["body"]): Promise<ProfileResponse> {
  try {
    console.log(`${LOG_PREFIX} Starting with input:`, input);
    const collection = db.collection(COLLECTIONS.PROFILES);

    // Check if profile already exists with this wallet
    const existing = await collection
      .where("walletAddress", "==", input.walletAddress)
      .limit(1)
      .get();

    console.log(`${LOG_PREFIX} Existing check result:`, { exists: !existing.empty });

    if (!existing.empty) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.PROFILE_EXISTS);
    }

    // Check if username is taken
    const existingUsername = await collection
      .where("username", "==", input.username)
      .limit(1)
      .get();

    console.log(`${LOG_PREFIX} Username check result:`, { exists: !existingUsername.empty });

    if (!existingUsername.empty) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.USERNAME_TAKEN);
    }

    const now = Timestamp.now();
    const docRef = collection.doc();

    // Create profile with explicit defaults
    const profile: Profile = {
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
      const stats: Stats = {
        id: profile.id,
        missionsCompleted: 0,
        profileId: profile.id,
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

    console.log(`${LOG_PREFIX} Successfully created profile and initialized stats:`, {
      id: profile.id,
    });

    return {
      ...profile,
      createdAt: toUnixMillis(profile.createdAt),
      updatedAt: toUnixMillis(profile.updatedAt),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      input,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function getProfile(id: string): Promise<ProfileWithStatsResponse> {
  try {
    console.log(`${LOG_PREFIX} Starting with id:`, id);
    const profileCollection = db.collection(COLLECTIONS.PROFILES);
    const statsCollection = db.collection(COLLECTIONS.STATS);

    // Get both profile and stats in parallel
    const [profileDoc, statsDoc] = await Promise.all([
      profileCollection.doc(id).get(),
      statsCollection.doc(id).get(),
    ]);

    console.log(`${LOG_PREFIX} Documents exist:`, {
      profile: profileDoc.exists,
      stats: statsDoc.exists,
    });

    if (!profileDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    const profileData = profileDoc.data() as Profile;
    const statsData = statsDoc.data() as Stats;

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
    console.error(`${LOG_PREFIX} Error:`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      id,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function getProfileByWallet(walletAddress: string): Promise<ProfileWithStatsResponse> {
  try {
    console.log(`${LOG_PREFIX} Starting with walletAddress:`, walletAddress);
    const profileCollection = db.collection(COLLECTIONS.PROFILES);

    const snapshot = await profileCollection
      .where("walletAddress", "==", walletAddress)
      .limit(1)
      .get();
    console.log(`${LOG_PREFIX} Profile found:`, { found: !snapshot.empty });

    if (snapshot.empty) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND_FOR_WALLET);
    }

    const profileData = snapshot.docs[0].data() as Profile;
    const statsDoc = await db.collection(COLLECTIONS.STATS).doc(profileData.id).get();

    const statsData = statsDoc.data() as Stats;

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
    console.error(`${LOG_PREFIX} Error:`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      walletAddress,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function updateProfile(
  id: string,
  input: ProfileUpdateRequest["body"],
): Promise<ProfileResponse> {
  try {
    console.log(`${LOG_PREFIX} Starting with:`, { id, input });
    const collection = db.collection(COLLECTIONS.PROFILES);

    const doc = await collection.doc(id).get();
    console.log(`${LOG_PREFIX} Document exists:`, doc.exists);

    if (!doc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    // If username is being updated, check if new username is taken
    if (input.username) {
      const existingUsername = await collection
        .where("username", "==", input.username)
        .limit(1)
        .get();

      console.log(`${LOG_PREFIX} Username check result:`, {
        exists: !existingUsername.empty,
        sameId: existingUsername.docs[0]?.id === id,
      });

      if (!existingUsername.empty && existingUsername.docs[0].id !== id) {
        throw ApiError.from(null, 400, ERROR_MESSAGES.USERNAME_TAKEN);
      }
    }

    const now = Timestamp.now();

    // Only include fields that are actually present in the input
    const updates: Partial<Profile> = {
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
        isProfilePublic: input.preferences.isProfilePublic ?? currentPrefs?.isProfilePublic ?? true,
        showStats: input.preferences.showStats ?? currentPrefs?.showStats ?? true,
      };
    }

    console.log(`${LOG_PREFIX} Updating profile`);
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    const data = updatedDoc.data() as Profile;
    return {
      ...data,
      createdAt: toUnixMillis(data.createdAt),
      updatedAt: toUnixMillis(data.updatedAt),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      id,
      input,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function searchProfiles(options: {
  query?: string;
  skillType?: string;
  minSkillLevel?: number;
  isVerified?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ profiles: Profile[]; total: number }> {
  try {
    const { query, skillType, minSkillLevel, isVerified, limit = 10, offset = 0 } = options;
    const profilesRef = db.collection(COLLECTIONS.PROFILES) as CollectionReference<Profile>;
    let finalQuery: Query<Profile> = profilesRef;

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
    console.error(`${LOG_PREFIX} Error searching profiles:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}
