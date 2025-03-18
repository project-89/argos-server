import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils";
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";
import {
  Profile,
  ProfileCreateRequest,
  ProfileUpdateRequest,
  ProfileResponse,
  ProfileWithStatsResponse,
  Stats,
} from "../schemas";
import { startMongoSession, withTransaction } from "../utils/mongo-session";
import { idFilter, notEqualIdFilter } from "../utils/mongo-filters";
import { ObjectId } from "mongodb";

const LOG_PREFIX = "[Profile Service]";

export async function createProfile(input: ProfileCreateRequest["body"]): Promise<ProfileResponse> {
  try {
    console.log(`${LOG_PREFIX} Starting with input:`, input);
    const db = await getDb();
    const profilesCollection = db.collection(COLLECTIONS.PROFILES);

    // Check if profile already exists with this wallet
    const existingByWallet = await profilesCollection.findOne({
      walletAddress: input.walletAddress,
    });

    console.log(`${LOG_PREFIX} Existing check result:`, { exists: !!existingByWallet });

    if (existingByWallet) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.PROFILE_EXISTS);
    }

    // Check if username is taken
    const existingByUsername = await profilesCollection.findOne({
      username: input.username,
    });

    console.log(`${LOG_PREFIX} Username check result:`, { exists: !!existingByUsername });

    if (existingByUsername) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.USERNAME_TAKEN);
    }

    const now = Date.now();

    // Create profile with explicit defaults
    const profile: Omit<Profile, "id"> = {
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

    // Use withTransaction pattern for better session management
    return await withTransaction(async (session) => {
      // Insert profile
      const profileResult = await profilesCollection.insertOne(profile, { session });
      const profileId = profileResult.insertedId.toString();

      // Initialize stats with explicit values
      const statsCollection = db.collection(COLLECTIONS.STATS);
      const stats: Omit<Stats, "id"> = {
        profileId: profileId,
        missionsCompleted: 0,
        successRate: 0,
        totalRewards: 0,
        reputation: 0,
        joinedAt: now,
        lastActive: now,
        createdAt: now,
        updatedAt: now,
      };

      // Insert stats with the same ID as the profile for easier reference
      await statsCollection.insertOne({ ...stats, _id: new ObjectId(profileId) }, { session });

      // Update result with the created ID
      const result: Profile = {
        ...profile,
        id: profileId,
      };

      return formatDocument<ProfileResponse>(result)!;
    });
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
    const db = await getDb();
    const profileCollection = db.collection(COLLECTIONS.PROFILES);
    const statsCollection = db.collection(COLLECTIONS.STATS);

    // Create ID filters for MongoDB
    const profileFilter = idFilter(id);
    const statsFilter = idFilter(id);

    if (!Object.keys(profileFilter).length) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.INVALID_INPUT);
    }

    // Get both profile and stats in parallel
    const [profileDoc, statsDoc] = await Promise.all([
      profileCollection.findOne(profileFilter),
      statsCollection.findOne(statsFilter),
    ]);

    console.log(`${LOG_PREFIX} Documents exist:`, {
      profile: !!profileDoc,
      stats: !!statsDoc,
    });

    if (!profileDoc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    const profileData = formatDocument<Profile>(profileDoc);
    const statsData = statsDoc ? formatDocument<Stats>(statsDoc) : null;

    return {
      ...profileData!,
      stats: statsData,
    } as ProfileWithStatsResponse;
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
    const db = await getDb();
    const profileCollection = db.collection(COLLECTIONS.PROFILES);

    const profileDoc = await profileCollection.findOne({ walletAddress });
    console.log(`${LOG_PREFIX} Profile found:`, { found: !!profileDoc });

    if (!profileDoc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND_FOR_WALLET);
    }

    const profileData = formatDocument<Profile>(profileDoc);

    // Use idFilter for proper ObjectId handling
    const statsFilter = idFilter(profileData!.id);
    const statsDoc = await db.collection(COLLECTIONS.STATS).findOne(statsFilter);

    const statsData = statsDoc ? formatDocument<Stats>(statsDoc) : null;

    return {
      ...profileData!,
      stats: statsData,
    } as ProfileWithStatsResponse;
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
    console.log(`${LOG_PREFIX} Starting with input:`, { id, input });
    const db = await getDb();
    const profilesCollection = db.collection(COLLECTIONS.PROFILES);

    // Create ID filter for MongoDB
    const filter = idFilter(id);
    if (!Object.keys(filter).length) {
      throw ApiError.from(null, 400, ERROR_MESSAGES.INVALID_INPUT);
    }

    // First check if profile exists
    const profileDoc = await profilesCollection.findOne(filter);

    if (!profileDoc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    // If username is being updated, check if new username is taken
    if (input.username) {
      // Use notEqualIdFilter for type-safe $ne query
      const usernameFilter = {
        username: input.username,
        ...notEqualIdFilter(id),
      };

      const existingUsername = await profilesCollection.findOne(usernameFilter);

      console.log(`${LOG_PREFIX} Username check result:`, {
        exists: !!existingUsername,
      });

      if (existingUsername) {
        throw ApiError.from(null, 400, ERROR_MESSAGES.USERNAME_TAKEN);
      }
    }

    const now = Date.now();

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
      const currentPrefs = formatDocument<Profile>(profileDoc!)?.preferences;
      updates.preferences = {
        isProfilePublic: input.preferences.isProfilePublic ?? currentPrefs?.isProfilePublic ?? true,
        showStats: input.preferences.showStats ?? currentPrefs?.showStats ?? true,
      };
    }

    console.log(`${LOG_PREFIX} Updating profile`);
    await profilesCollection.updateOne(filter, { $set: updates });

    const updatedDoc = await profilesCollection.findOne(filter);
    return formatDocument<ProfileResponse>(updatedDoc)!;
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
    const db = await getDb();
    const profilesCollection = db.collection(COLLECTIONS.PROFILES);

    let filter: any = {};

    // Handle capability filtering
    if (skillType || minSkillLevel !== undefined || isVerified !== undefined) {
      const capabilitiesCollection = db.collection(COLLECTIONS.CAPABILITIES);
      let capabilitiesFilter: any = {};

      if (skillType) {
        capabilitiesFilter.type = skillType;
      }

      if (minSkillLevel !== undefined) {
        capabilitiesFilter.level = { $gte: minSkillLevel };
      }

      if (isVerified !== undefined) {
        capabilitiesFilter.isVerified = isVerified;
      }

      const capabilitiesDocs = await capabilitiesCollection.find(capabilitiesFilter).toArray();

      if (capabilitiesDocs.length === 0) {
        return { profiles: [], total: 0 };
      }

      const eligibleProfileIds = capabilitiesDocs.map((doc) => doc.profileId);
      filter._id = { $in: eligibleProfileIds.map((id) => new ObjectId(id)) };
    }

    // Add text search conditions
    if (query) {
      // Using text index if set up, otherwise use basic search
      const hasTextIndex = await profilesCollection.indexExists("username_text_bio_text");

      if (hasTextIndex) {
        filter.$text = { $search: query };
      } else {
        // Fallback to basic search if no text index
        const queryRegex = new RegExp(query, "i");
        filter.$or = [{ username: queryRegex }, { bio: queryRegex }];
      }
    }

    // Get total count
    const total = await profilesCollection.countDocuments(filter);

    // Get paginated results
    const docs = await profilesCollection
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const profiles = formatDocuments<Profile>(docs);
    return { profiles, total };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error searching profiles:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}
