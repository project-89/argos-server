import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { TagData, TagUserResponse } from "../types/api.types";

export interface TagLimitData {
  firstTaggedAt: Timestamp;
  remainingDailyTags: number;
  lastTagResetAt: Timestamp;
}

export interface FingerprintData {
  tags?: TagData[];
  tagLimits?: TagLimitData;
}

const LOG_PREFIX = "[Tag Service]";
const MAX_DAILY_TAGS = 10;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Check and update daily tag limits
 */
const checkAndUpdateTagLimits = async (
  taggerRef: FirebaseFirestore.DocumentReference,
  taggerData: FingerprintData,
  targetIsIt: boolean,
): Promise<void> => {
  const now = Timestamp.now();
  const tagLimits = taggerData.tagLimits;

  // If no tag limits exist, this is their first time being "it"
  if (!tagLimits) {
    await taggerRef.update({
      tagLimits: {
        firstTaggedAt: now,
        remainingDailyTags: MAX_DAILY_TAGS - (targetIsIt ? 1 : 0),
        lastTagResetAt: now,
      },
    });
    return;
  }

  // Check if 24 hours have passed since last reset
  const timeSinceReset = now.toMillis() - tagLimits.lastTagResetAt.toMillis();
  const shouldReset = timeSinceReset >= MILLISECONDS_IN_DAY;

  // If target is already "it", we need to deduct a tag
  if (targetIsIt) {
    if (tagLimits.remainingDailyTags <= 0 && !shouldReset) {
      throw new ApiError(429, ERROR_MESSAGES.NO_TAGS_REMAINING);
    }
  }

  // Update tag limits
  const newTagLimits = {
    firstTaggedAt: tagLimits.firstTaggedAt,
    remainingDailyTags: shouldReset
      ? MAX_DAILY_TAGS - (targetIsIt ? 1 : 0)
      : tagLimits.remainingDailyTags - (targetIsIt ? 1 : 0),
    lastTagResetAt: shouldReset ? now : tagLimits.lastTagResetAt,
  };

  await taggerRef.update({ tagLimits: newTagLimits });
};

/**
 * Tag another user as "it"
 */
export const tagUser = async (
  taggerFingerprintId: string,
  targetFingerprintId: string,
): Promise<TagUserResponse> => {
  try {
    console.log(
      `${LOG_PREFIX} Attempting to tag user ${targetFingerprintId} as "it" by ${taggerFingerprintId}`,
    );

    // Validate inputs
    if (taggerFingerprintId === targetFingerprintId) {
      throw new ApiError(400, ERROR_MESSAGES.CANNOT_TAG_SELF);
    }

    const db = getFirestore();

    // Get tagger fingerprint to verify they exist and check if they're "it"
    const taggerRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(taggerFingerprintId);
    const taggerDoc = await taggerRef.get();

    if (!taggerDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.TAGGER_NOT_FOUND);
    }

    // Check if tagger is "it"
    const taggerData = taggerDoc.data() as FingerprintData;
    const taggerTags = taggerData?.tags || [];
    const taggerIsIt = taggerTags.some((tag) => tag.tag === "it");

    if (!taggerIsIt) {
      throw new ApiError(403, ERROR_MESSAGES.NOT_IT);
    }

    // Get target fingerprint
    const targetRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(targetFingerprintId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const targetData = targetDoc.data() as FingerprintData;
    const currentTags = targetData?.tags || [];

    // Check if target is already "it"
    const targetIsIt = currentTags.some((tag) => tag.tag === "it");
    if (targetIsIt) {
      // Check and update tag limits before returning error
      await checkAndUpdateTagLimits(taggerRef, taggerData, targetIsIt);
      throw new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED);
    }

    // Check and update tag limits
    await checkAndUpdateTagLimits(taggerRef, taggerData, targetIsIt);

    // Create new tag
    const newTag: TagData = {
      tag: "it",
      taggedBy: taggerFingerprintId,
      taggedAt: Timestamp.now(),
    };

    // Update target's tags - tagger keeps their "it" status
    await targetRef.update({
      tags: [...currentTags, newTag],
    });

    console.log(`${LOG_PREFIX} Successfully tagged user ${targetFingerprintId} as "it"`);
    return {
      success: true,
      message: "Successfully tagged user as 'it'",
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in tagUser:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get remaining daily tags for a user
 */
export const getRemainingTags = async (fingerprintId: string): Promise<number> => {
  try {
    console.log(`${LOG_PREFIX} Getting remaining tags for user ${fingerprintId}`);

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const tagLimits = data.tagLimits;

    if (!tagLimits) {
      return 0; // User has never been "it"
    }

    // Check if 24 hours have passed since last reset
    const now = Timestamp.now();
    const timeSinceReset = now.toMillis() - tagLimits.lastTagResetAt.toMillis();

    if (timeSinceReset >= MILLISECONDS_IN_DAY) {
      return MAX_DAILY_TAGS;
    }

    return tagLimits.remainingDailyTags;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getRemainingTags:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Check if a user is currently "it"
 */
export const isUserIt = async (fingerprintId: string): Promise<boolean> => {
  try {
    console.log(`${LOG_PREFIX} Checking if user ${fingerprintId} is "it"`);

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    const currentTags = data?.tags || [];

    return currentTags.some((tag) => tag.tag === "it");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in isUserIt:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get tag history for a user
 */
export const getTagHistory = async (fingerprintId: string): Promise<TagData[]> => {
  try {
    console.log(`${LOG_PREFIX} Getting tag history for user ${fingerprintId}`);

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as FingerprintData;
    return data?.tags || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getTagHistory:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
