import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { ERROR_MESSAGES } from "../constants/api";
import { TagData, TagUserResponse } from "../types/api.types";

export interface FingerprintData {
  tags?: TagData[];
}

const LOG_PREFIX = "[Tag Service]";

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

    // Get target fingerprint
    const targetRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(targetFingerprintId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Get tagger fingerprint to verify they exist
    const taggerRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(taggerFingerprintId);
    const taggerDoc = await taggerRef.get();

    if (!taggerDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.TAGGER_NOT_FOUND);
    }

    const targetData = targetDoc.data() as FingerprintData;
    const currentTags = targetData?.tags || [];

    // Check if target is already "it"
    if (currentTags.some((tag) => tag.tag === "it")) {
      throw new ApiError(400, ERROR_MESSAGES.ALREADY_TAGGED);
    }

    // Create new tag
    const newTag: TagData = {
      tag: "it",
      taggedBy: taggerFingerprintId,
      taggedAt: Timestamp.now(),
    };

    // Update target's tags
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
