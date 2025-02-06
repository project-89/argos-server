import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ApiError, getCurrentUnixMillis, toUnixMillis } from "../utils";
import { ERROR_MESSAGES, COLLECTIONS } from "../constants";
import { PresenceData, VisitPresence } from "../types";

// 5 minutes of inactivity before marking as away
const AWAY_TIMEOUT_MS = 5 * 60 * 1000;

type PresenceStatus = VisitPresence["status"];

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
export const updatePresence = async ({
  fingerprintId,
  status,
}: {
  fingerprintId: string;
  status: PresenceStatus;
}): Promise<VisitPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const now = Timestamp.now();
    const presenceData: PresenceData = {
      status,
      lastUpdated: now,
      createdAt: now,
    };

    await fingerprintRef.update({
      presence: presenceData,
    });

    return {
      fingerprintId,
      status,
      lastUpdated: toUnixMillis(now),
      createdAt: toUnixMillis(now),
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS);
  }
};

/**
 * Get current presence status for a fingerprint
 */
export const getPresence = async ({
  fingerprintId,
}: {
  fingerprintId: string;
}): Promise<VisitPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data();
    const presence = data?.presence as PresenceData | undefined;
    const now = getCurrentUnixMillis();

    if (!presence) {
      return {
        fingerprintId,
        status: "offline",
        lastUpdated: now,
        createdAt: now,
      };
    }

    // Check if user should be marked as away
    if (presence.status === "online" && shouldMarkAsAway(toUnixMillis(presence.lastUpdated))) {
      const awayPresence = await updatePresence({ fingerprintId, status: "away" });
      return awayPresence;
    }

    return {
      fingerprintId,
      status: presence.status,
      lastUpdated: toUnixMillis(presence.lastUpdated),
      createdAt: toUnixMillis(presence.createdAt),
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_GET_PRESENCE);
  }
};

/**
 * Update activity timestamp for a fingerprint
 */
export const updateActivity = async ({
  fingerprintId,
}: {
  fingerprintId: string;
}): Promise<VisitPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data();
    const presence = data?.presence as PresenceData | undefined;
    const now = Timestamp.now();

    // If no presence or currently offline, set as online
    if (!presence || presence.status === "offline") {
      return updatePresence({ fingerprintId, status: "online" });
    }

    // Update last activity
    const presenceData: PresenceData = {
      status: presence.status === "away" ? "online" : presence.status, // Set back to online if away
      lastUpdated: now,
      createdAt: now,
    };

    await fingerprintRef.update({
      presence: presenceData,
    });

    return {
      fingerprintId,
      status: presenceData.status,
      lastUpdated: toUnixMillis(presenceData.lastUpdated),
      createdAt: toUnixMillis(presenceData.createdAt),
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_ACTIVITY);
  }
};
