import { COLLECTIONS, ERROR_MESSAGES, TAG_LIMITS } from "../constants";
import { AnonUser, FindAnonUserParams, DiscoveryInfo, SocialPlatform } from "../schemas";
import { hashSocialIdentity, ApiError } from "../utils";
import { getDb, formatDocument } from "../utils/mongodb";

const LOG_PREFIX = "[Social Service]";

// Pure Functions

/**
 * Creates the base data for a new anonymous social user
 */
const createAnonUserData = ({
  platform,
  hashedUsername,
  usernameSalt,
  discoveryInfo,
  initialTagLimits,
  now,
}: {
  platform: "x";
  hashedUsername: string;
  usernameSalt: string;
  discoveryInfo: DiscoveryInfo;
  initialTagLimits: boolean;
  now: Date;
}): Omit<AnonUser, "id"> => {
  const baseData = {
    identities: [
      {
        platform,
        hashedUsername,
        usernameSalt,
        lastSeen: now,
      },
    ],
    status: "active" as const,
    tags: [],
    createdAt: now,
    updatedAt: now,
    discoverySource: {
      type: discoveryInfo.action,
      createdAt: discoveryInfo.createdAt,
      relatedHashedUsername: discoveryInfo.relatedHashedUsername,
    },
  };

  if (!initialTagLimits) {
    return baseData;
  }

  return {
    ...baseData,
    tagLimits: {
      firstTaggedAt: now.getTime(),
      remainingDailyTags: TAG_LIMITS.DAILY_TAGS,
      lastTagResetAt: now.getTime(),
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    },
  };
};

/**
 * Creates the update data for discovery information
 */
const createDiscoveryUpdate = ({
  platform,
  discoveryInfo,
  now,
}: {
  platform: string;
  discoveryInfo: DiscoveryInfo;
  now: Date;
}) => ({
  $set: {
    "identities.0.lastSeen": now,
    discoverySource: {
      platform,
      type: discoveryInfo.action,
      createdAt: discoveryInfo.createdAt,
      relatedHashedUsername: discoveryInfo.relatedHashedUsername,
    },
    updatedAt: now,
  },
});

// Database Operations

/**
 * Find an anonymous social user by their hashed username
 */
export const findAnonUser = async ({
  hashedUsername,
}: FindAnonUserParams): Promise<{
  id: string;
  data: AnonUser;
} | null> => {
  try {
    console.log(`${LOG_PREFIX} Finding anonymous user with hashed username: ${hashedUsername}`);
    const db = await getDb();
    const existingUser = await db
      .collection(COLLECTIONS.ANON_USERS)
      .findOne({ "identities.hashedUsername": hashedUsername });

    if (!existingUser) {
      return null;
    }

    return {
      id: existingUser.id,
      data: formatDocument(existingUser) as AnonUser,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in findAnonUser:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Find an anonymous social user by username
 */
export const findAnonUserByUsername = async ({
  username,
  platform,
}: {
  username: string;
  platform: SocialPlatform;
}): Promise<{ id: string; data: AnonUser } | null> => {
  try {
    console.log(`${LOG_PREFIX} Finding anonymous user by username: ${username}`);
    const { hashedUsername } = hashSocialIdentity(platform, username);
    return findAnonUser({ hashedUsername });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in findAnonUserByUsername:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Create a new anonymous social user
 */
export const createAnonUser = async ({
  username,
  platform,
  discoveryInfo,
  initialTagLimits = false,
}: {
  username: string;
  platform: "x";
  discoveryInfo: DiscoveryInfo;
  initialTagLimits: boolean;
}): Promise<AnonUser> => {
  try {
    console.log(`${LOG_PREFIX} Creating new anonymous user with username: ${username}`);
    const db = await getDb();
    const now = new Date();
    const { hashedUsername, usernameSalt } = hashSocialIdentity(platform, username);

    const userData = createAnonUserData({
      platform,
      hashedUsername,
      usernameSalt,
      discoveryInfo,
      initialTagLimits,
      now,
    });

    const userWithId = {
      id: crypto.randomUUID(),
      ...userData,
    };

    await db.collection(COLLECTIONS.ANON_USERS).insertOne(userWithId);
    return userWithId as AnonUser;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in createAnonUser:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Update an anonymous social user's discovery information
 */
export const updateAnonUserDiscovery = async ({
  userId,
  platform,
  discoveryInfo,
}: {
  userId: string;
  platform: "x";
  discoveryInfo: DiscoveryInfo;
}): Promise<void> => {
  try {
    console.log(`${LOG_PREFIX} Updating anonymous user discovery`);
    const db = await getDb();
    const now = new Date();
    const update = createDiscoveryUpdate({ platform, discoveryInfo, now });

    await db.collection(COLLECTIONS.ANON_USERS).updateOne({ id: userId }, update);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in updateAnonUserDiscovery:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Main function to handle social user operations
 */
export const handleSocialUser = async ({
  username,
  platform,
  discoveryInfo,
  initialTagLimits = false,
}: {
  username: string;
  platform: "x";
  discoveryInfo: DiscoveryInfo;
  initialTagLimits: boolean;
}): Promise<AnonUser> => {
  try {
    console.log(`${LOG_PREFIX} Handling social user with username: ${username}`);
    // First try to find
    const existingUser = await findAnonUserByUsername({ username, platform });

    // If found, update discovery and return
    if (existingUser) {
      await updateAnonUserDiscovery({
        userId: existingUser.id,
        platform,
        discoveryInfo,
      });
      return existingUser.data;
    }

    // If not found, create new
    return createAnonUser({
      username,
      platform,
      discoveryInfo,
      initialTagLimits,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in handleSocialUser:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
