import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { getCurrentUnixMillis } from "../utils/timestamp";
import { ERROR_MESSAGES } from "../constants/api";
import { VisitPresence } from "../types/api.types";

// 5 minutes of inactivity before marking as away
const AWAY_TIMEOUT_MS = 5 * 60 * 1000;

type PresenceStatus = VisitPresence["status"];

interface PresenceData {
  status: PresenceStatus;
  lastUpdated: number; // Unix timestamp for tracking last activity/status update
}

/**
 * Check if user should be marked as away based on last activity
 */
const shouldMarkAsAway = (lastUpdated: number): boolean => {
  const now = getCurrentUnixMillis();
  return now - lastUpdated > AWAY_TIMEOUT_MS;
};

/**
 * Update presence status for a fingerprint
 */
export const updatePresence = async (
  fingerprintId: string,
  status: PresenceStatus,
): Promise<VisitPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const now = getCurrentUnixMillis();
    const presenceData: PresenceData = {
      status,
      lastUpdated: now,
    };

    await fingerprintRef.update({
      presence: presenceData,
    });

    return {
      fingerprintId,
      status,
      lastUpdated: now,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in updatePresence:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get current presence status for a fingerprint
 */
export const getPresence = async (fingerprintId: string): Promise<VisitPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data();
    const presence = data?.presence as PresenceData | undefined;
    const now = getCurrentUnixMillis();

    if (!presence) {
      return {
        fingerprintId,
        status: "offline",
        lastUpdated: now,
      };
    }

    // Check if user should be marked as away
    if (presence.status === "online" && shouldMarkAsAway(presence.lastUpdated)) {
      const awayPresence = await updatePresence(fingerprintId, "away");
      return awayPresence;
    }

    return {
      fingerprintId,
      status: presence.status,
      lastUpdated: presence.lastUpdated,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in getPresence:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Update activity timestamp for a fingerprint
 */
export const updateActivity = async (fingerprintId: string): Promise<VisitPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data();
    const presence = data?.presence as PresenceData | undefined;
    const now = getCurrentUnixMillis();

    // If no presence or currently offline, set as online
    if (!presence || presence.status === "offline") {
      return updatePresence(fingerprintId, "online");
    }

    // Update last activity
    const presenceData: PresenceData = {
      status: presence.status === "away" ? "online" : presence.status, // Set back to online if away
      lastUpdated: now,
    };

    await fingerprintRef.update({
      presence: presenceData,
    });

    return {
      fingerprintId,
      status: presenceData.status,
      lastUpdated: now,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in updateActivity:", error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
