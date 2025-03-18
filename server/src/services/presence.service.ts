import { ApiError, getCurrentUnixMillis } from "../utils";
import { ERROR_MESSAGES, COLLECTIONS } from "../constants";
import { PresenceData, PresenceResponse } from "../schemas";

// Import MongoDB utilities
import { getDb, formatDocument } from "../utils/mongodb";
import { stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Presence Service]";

// 5 minutes of inactivity before marking as away
const AWAY_TIMEOUT_MS = 5 * 60 * 1000;

type PresenceStatus = PresenceData["status"];

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
}): Promise<PresenceResponse> => {
  try {
    const db = await getDb();

    // Create a fingerprint filter using string ID
    const fingerprintFilter = stringIdFilter("_id", fingerprintId);

    // Check if fingerprint exists
    const fingerprint = await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .findOne(fingerprintFilter, { projection: { _id: 1 } });

    if (!fingerprint) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const now = new Date();
    const presenceData: PresenceData = {
      status,
      lastUpdated: now,
      createdAt: now,
    };

    // Update the fingerprint document with new presence data
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .updateOne(fingerprintFilter, { $set: { presence: presenceData } });

    console.log(`${LOG_PREFIX} Updated presence for ${fingerprintId} to ${status}`);

    return {
      fingerprintId,
      status,
      lastUpdated: now.getTime(),
      createdAt: now.getTime(),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating presence:`, error);
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
}): Promise<PresenceResponse> => {
  try {
    const db = await getDb();

    // Create a fingerprint filter using string ID
    const fingerprintFilter = stringIdFilter("_id", fingerprintId);

    // Get fingerprint document
    const fingerprint = await db.collection(COLLECTIONS.FINGERPRINTS).findOne(fingerprintFilter);

    if (!fingerprint) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const presence = fingerprint.presence as PresenceData | undefined;
    const now = getCurrentUnixMillis();

    // If no presence data exists, return offline status
    if (!presence) {
      return {
        fingerprintId,
        status: "offline",
        lastUpdated: now,
        createdAt: now,
      };
    }

    const lastUpdatedTime =
      presence.lastUpdated instanceof Date ? presence.lastUpdated.getTime() : presence.lastUpdated;

    // Check if user should be marked as away
    if (presence.status === "online" && shouldMarkAsAway(lastUpdatedTime)) {
      const awayPresence = await updatePresence({ fingerprintId, status: "away" });
      return awayPresence;
    }

    const createdAtTime =
      presence.createdAt instanceof Date ? presence.createdAt.getTime() : presence.createdAt;

    return {
      fingerprintId,
      status: presence.status,
      lastUpdated: lastUpdatedTime,
      createdAt: createdAtTime,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting presence:`, error);
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
}): Promise<PresenceResponse> => {
  try {
    const db = await getDb();

    // Create a fingerprint filter using string ID
    const fingerprintFilter = stringIdFilter("_id", fingerprintId);

    // Get fingerprint document
    const fingerprint = await db.collection(COLLECTIONS.FINGERPRINTS).findOne(fingerprintFilter);

    if (!fingerprint) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const presence = fingerprint.presence as PresenceData | undefined;
    const now = new Date();

    // If no presence or currently offline, set as online
    if (!presence || presence.status === "offline") {
      return updatePresence({ fingerprintId, status: "online" });
    }

    // Update last activity
    const presenceData: PresenceData = {
      status: presence.status === "away" ? "online" : presence.status, // Set back to online if away
      lastUpdated: now,
      createdAt: presence.createdAt || now,
    };

    // Update the fingerprint document with new presence data
    await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .updateOne(fingerprintFilter, { $set: { presence: presenceData } });

    console.log(`${LOG_PREFIX} Updated activity timestamp for ${fingerprintId}`);

    return {
      fingerprintId,
      status: presenceData.status,
      lastUpdated: now.getTime(),
      createdAt:
        presenceData.createdAt instanceof Date
          ? presenceData.createdAt.getTime()
          : presenceData.createdAt,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating activity:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_UPDATE_ACTIVITY);
  }
};
