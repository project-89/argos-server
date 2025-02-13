import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES, TAG_LIMITS } from "../constants";
import {
  AnonUser,
  UpdateStatusParams,
  LinkParams,
  FindAnonUserParams,
  DiscoveryInfo,
  SocialPlatform,
} from "../schemas";

import { hashSocialIdentity, ApiError } from "../utils";

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
  now: Timestamp;
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
      firstTaggedAt: now,
      remainingDailyTags: TAG_LIMITS.DAILY_TAGS,
      lastTagResetAt: now,
      createdAt: now,
      updatedAt: now,
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
  now: Timestamp;
}) => ({
  "identities.0.lastSeen": now,
  discoverySource: {
    platform,
    type: discoveryInfo.action,
    createdAt: discoveryInfo.createdAt,
    relatedHashedUsername: discoveryInfo.relatedHashedUsername,
  },
});

// Database Operations

/**
 * Find an anonymous social user by their hashed username
 */
export const findAnonUser = async ({
  hashedUsername,
}: FindAnonUserParams): Promise<{
  doc: FirebaseFirestore.QueryDocumentSnapshot;
  data: AnonUser;
} | null> => {
  try {
    const db = getFirestore();
    const query = db
      .collection(COLLECTIONS.ANON_USERS)
      .where("identities.hashedUsername", "==", hashedUsername);
    const existingDocs = await query.get();

    if (existingDocs.empty) {
      return null;
    }

    const doc = existingDocs.docs[0];
    return {
      doc,
      data: { id: doc.id, ...doc.data() } as AnonUser,
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
}): Promise<{ doc: FirebaseFirestore.QueryDocumentSnapshot; data: AnonUser } | null> => {
  try {
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
    const db = getFirestore();
    const now = Timestamp.now();
    const { hashedUsername, usernameSalt } = hashSocialIdentity(platform, username);

    const userData = createAnonUserData({
      platform,
      hashedUsername,
      usernameSalt,
      discoveryInfo,
      initialTagLimits,
      now,
    });

    const newDoc = await db.collection(COLLECTIONS.ANON_USERS).add(userData);
    const newDocData = await newDoc.get();

    if (!newDocData.exists) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    return { id: newDoc.id, ...newDocData.data() } as AnonUser;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in createAnonUser:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Update an anonymous social user's discovery information
 */
export const updateAnonUserDiscovery = async ({
  docRef,
  platform,
  discoveryInfo,
}: {
  docRef: FirebaseFirestore.DocumentReference;
  platform: "x";
  discoveryInfo: DiscoveryInfo;
}): Promise<void> => {
  try {
    const now = Timestamp.now();
    const update = createDiscoveryUpdate({ platform, discoveryInfo, now });
    await docRef.update(update);
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
    // First try to find
    const existingUser = await findAnonUserByUsername({ username, platform });

    // If found, update discovery and return
    if (existingUser) {
      await updateAnonUserDiscovery({
        docRef: existingUser.doc.ref,
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
