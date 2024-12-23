import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { ApiError } from "../utils/error";

export type PresenceStatus = "online" | "offline";

export interface PresenceData {
  status: PresenceStatus;
  lastUpdated: string;
}

export interface FingerprintPresence {
  fingerprintId: string;
  status: PresenceStatus;
  lastUpdated: string;
}

/**
 * Update presence status for a fingerprint
 */
export const updatePresence = async (
  fingerprintId: string,
  status: PresenceStatus,
): Promise<FingerprintPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    const lastUpdated = new Date().toISOString();
    const presenceData: PresenceData = {
      status,
      lastUpdated,
    };

    await fingerprintRef.update({
      presence: presenceData,
    });

    return {
      fingerprintId,
      status,
      lastUpdated,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in updatePresence:", error);
    throw new ApiError(500, "Failed to update presence status");
  }
};

/**
 * Get current presence status for a fingerprint
 */
export const getPresence = async (fingerprintId: string): Promise<FingerprintPresence> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    const data = fingerprintDoc.data();
    const presence = data?.presence as PresenceData | undefined;

    if (!presence) {
      return {
        fingerprintId,
        status: "offline",
        lastUpdated: new Date().toISOString(),
      };
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
    throw new ApiError(500, "Failed to get presence status");
  }
};
