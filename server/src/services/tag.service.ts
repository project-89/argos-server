import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import {
  TagData,
  TagLimitData,
  TagResponse,
  AddTagParams,
  CheckTagLimitsParams,
  TagUserParams,
} from "../schemas/tag.schema";
import { AnonUser, SocialPlatform } from "../schemas/social.schema";
import { ApiError } from "../utils";
import { handleSocialUser } from "./social.service";

const LOG_PREFIX = "[Tag Service]";
const MAX_DAILY_TAGS = 3;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

// Pure Functions
const isValidTagAttempt = (taggerUsername: string, targetUsername: string): boolean =>
  taggerUsername !== targetUsername;

const hasTagType = (user: AnonUser, tagType: string): boolean =>
  user.tags.some((tag) => tag.type === tagType);

const createTagData = (
  taggerIdentity: { hashedUsername: string },
  tagType: string,
  platform: SocialPlatform,
): TagData => ({
  type: tagType,
  taggedBy: taggerIdentity.hashedUsername,
  taggedAt: Timestamp.now(),
  platform,
});

const shouldResetDailyTags = (lastResetTime: Timestamp): boolean => {
  const now = Timestamp.now();
  return now.toMillis() - lastResetTime.toMillis() >= MILLISECONDS_IN_DAY;
};

const createInitialTagLimits = (now: Timestamp): TagLimitData => ({
  firstTaggedAt: now,
  remainingDailyTags: MAX_DAILY_TAGS,
  lastTagResetAt: now,
  createdAt: now,
  updatedAt: now,
});

const calculateNewTagLimits = (
  currentLimits: TagLimitData,
  shouldReset: boolean,
  shouldDecrement: boolean,
): TagLimitData => {
  const now = Timestamp.now();
  if (shouldReset) {
    return {
      ...currentLimits,
      remainingDailyTags: MAX_DAILY_TAGS,
      lastTagResetAt: now,
      updatedAt: now,
    };
  }
  if (shouldDecrement) {
    return {
      ...currentLimits,
      remainingDailyTags: currentLimits.remainingDailyTags - 1,
      updatedAt: now,
    };
  }
  return currentLimits;
};

// Database Operations
const updateUserTagLimits = async (userId: string, tagLimits: TagLimitData): Promise<void> => {
  const db = getFirestore();
  await db.collection(COLLECTIONS.ANON_USERS).doc(userId).update({ tagLimits });
};

const addTagToUser = async (userId: string, tag: TagData): Promise<void> => {
  const db = getFirestore();
  const anonUserRef = db.collection(COLLECTIONS.ANON_USERS).doc(userId);
  const anonUserDoc = await anonUserRef.get();

  if (!anonUserDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  await anonUserRef.update({
    tags: FieldValue.arrayUnion(tag),
    updatedAt: Timestamp.now(),
  });
};

const processTagLimits = async (user: AnonUser, targetHasTag: boolean): Promise<number> => {
  try {
    const now = Timestamp.now();

    // Initialize tag limits if they don't exist
    if (!user.tagLimits) {
      const newTagLimits = createInitialTagLimits(now);
      await updateUserTagLimits(user.id, newTagLimits);
      return MAX_DAILY_TAGS;
    }

    const { lastTagResetAt, remainingDailyTags } = user.tagLimits;
    const needsReset = shouldResetDailyTags(lastTagResetAt);

    // Handle daily reset
    if (needsReset) {
      const updatedLimits = calculateNewTagLimits(user.tagLimits, true, false);
      await updateUserTagLimits(user.id, updatedLimits);
      return MAX_DAILY_TAGS;
    }

    // Handle tag attempt on already tagged user
    if (targetHasTag) {
      if (remainingDailyTags <= 0) {
        throw new ApiError(403, ERROR_MESSAGES.NO_REMAINING_TAGS);
      }

      const updatedLimits = calculateNewTagLimits(user.tagLimits, false, true);
      await updateUserTagLimits(user.id, updatedLimits);
      return updatedLimits.remainingDailyTags;
    }

    return remainingDailyTags;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in processTagLimits:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

const getOrCreateUsers = async (
  taggerUsername: string,
  targetUsername: string,
  platform: "x",
): Promise<[AnonUser, AnonUser]> => {
  const now = Timestamp.now();
  return Promise.all([
    handleSocialUser({
      username: taggerUsername,
      platform,
      discoveryInfo: {
        action: "tagging",
        createdAt: now,
        relatedHashedUsername: targetUsername,
      },
      initialTagLimits: true,
    }),
    handleSocialUser({
      username: targetUsername,
      platform,
      discoveryInfo: {
        action: "being_tagged",
        createdAt: now,
        relatedHashedUsername: taggerUsername,
      },
      initialTagLimits: true,
    }),
  ]);
};

/**
 * Tag a user by their social identity
 * You can tag any number of users who aren't already "it"
 * Attempting to tag someone who is already "it" costs one daily tag
 */
export const tagUserBySocialIdentity = async ({
  taggerUsername,
  targetUsername,
  platform = "x",
  tagType,
}: TagUserParams): Promise<TagResponse> => {
  try {
    // Validate basic requirements
    if (!isValidTagAttempt(taggerUsername, targetUsername)) {
      throw new ApiError(400, ERROR_MESSAGES.CANNOT_TAG_SELF);
    }

    // Get or create user records
    const [tagger, target] = await getOrCreateUsers(taggerUsername, targetUsername, platform);

    // Validate tag possession
    if (!hasTagType(tagger, tagType)) {
      throw new ApiError(403, ERROR_MESSAGES.NOT_IT);
    }

    // Check if target already tagged
    const targetHasTag = hasTagType(target, tagType);
    if (targetHasTag) {
      const remainingTags = await processTagLimits(tagger, true);
      throw new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED);
    }

    // Get tagger's primary identity
    const taggerIdentity = tagger.identities[0];
    if (!taggerIdentity) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    // Create and add new tag
    const tagData = createTagData(taggerIdentity, tagType, platform);
    await addTagToUser(target.id, tagData);

    // Process tag limits
    const remainingTags = await processTagLimits(tagger, false);

    return {
      success: true,
      message: `Successfully tagged user with ${tagType}`,
      remainingTags,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in tagUserBySocialIdentity:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
