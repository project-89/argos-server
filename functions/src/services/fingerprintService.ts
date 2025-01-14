import { Request } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ROLE } from "../constants/roles";
import { ERROR_MESSAGES } from "../constants/api";

import { Fingerprint } from "../types/models";
import { ApiError } from "../utils/error";
import { deepMerge } from "../utils/object";

export interface FingerprintDocData extends Omit<Fingerprint, "createdAt" | "ipMetadata"> {
  id: string;
  createdAt: Timestamp;
  ipMetadata: {
    primaryIp?: string;
    ipFrequency: Record<string, number>;
    lastSeenAt: Record<string, Timestamp>;
  };
}

/**
 * Extracts client IP from request
 */
export const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
};

/**
 * Creates a new fingerprint record
 */
export const createFingerprint = async (
  fingerprint: string,
  ip: string,
  metadata?: Record<string, any>,
): Promise<FingerprintDocData> => {
  const now = Timestamp.now();
  const docData: Omit<FingerprintDocData, "id"> = {
    fingerprint,
    roles: [ROLE.USER], // Always use default user role
    createdAt: now,
    tags: [], // Initialize empty tags array
    lastVisited: now,
    metadata: metadata || {},
    ipAddresses: [ip],
    ipMetadata: {
      primaryIp: ip,
      ipFrequency: { [ip]: 1 },
      lastSeenAt: { [ip]: now },
    },
  };

  const db = getFirestore();
  const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add(docData);

  return {
    id: fingerprintRef.id,
    ...docData,
  };
};

/**
 * Gets a fingerprint record and updates its IP metadata
 */
export const getFingerprintAndUpdateIp = async (
  id: string,
  ip: string,
): Promise<{ data: FingerprintDocData }> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(id);

  try {
    const updatedDoc = await db.runTransaction(async (transaction) => {
      const fingerprintDoc = await transaction.get(fingerprintRef);

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
      }

      const data = fingerprintDoc.data() as FingerprintDocData;
      const ipAddresses = data.ipAddresses || [];
      const ipMetadata = data.ipMetadata || {
        ipFrequency: {},
        lastSeenAt: {},
        primaryIp: undefined,
      };

      // Ensure tags property exists
      if (!data.tags) {
        data.tags = [];
      }

      // Update IP frequency and last seen
      const newFrequency = (ipMetadata.ipFrequency[ip] || 0) + 1;
      ipMetadata.ipFrequency[ip] = newFrequency;
      ipMetadata.lastSeenAt[ip] = Timestamp.now();

      // Determine primary IP (most frequent)
      const [primaryIp] = Object.entries(ipMetadata.ipFrequency).reduce(
        (a, b) => (a[1] > b[1] ? a : b),
        [ip, 0], // Default to current IP if no frequencies exist
      );
      ipMetadata.primaryIp = primaryIp;

      // Check if this is a new IP
      if (!ipAddresses.includes(ip)) {
        ipAddresses.push(ip);
      }

      // Update the document
      transaction.update(fingerprintRef, {
        ipAddresses,
        ipMetadata,
      });

      return {
        data: {
          ...data,
          id: fingerprintDoc.id,
          ipAddresses,
          ipMetadata,
        },
      };
    });

    return updatedDoc;
  } catch (error) {
    // Re-throw ApiErrors
    if (error instanceof ApiError) {
      throw error;
    }
    console.error(`[Fingerprint ${id}] Error updating IP:`, error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Verifies fingerprint exists and ownership
 */
export const verifyFingerprint = async (
  fingerprintId: string,
  authenticatedId?: string,
): Promise<void> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
  const fingerprintDoc = await fingerprintRef.get();

  if (!fingerprintDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
  }

  if (authenticatedId && fingerprintId !== authenticatedId) {
    throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  }
};

/**
 * Updates fingerprint metadata
 */
export const updateFingerprintMetadata = async (
  fingerprintId: string,
  metadata: Record<string, any>,
): Promise<FingerprintDocData> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);

  try {
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    const data = fingerprintDoc.data() as FingerprintDocData;
    const updatedMetadata = deepMerge(data.metadata || {}, metadata);

    await fingerprintRef.update({
      metadata: updatedMetadata,
    });

    return {
      ...data,
      id: fingerprintDoc.id,
      metadata: updatedMetadata,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in updateFingerprintMetadata:", error);
    throw new ApiError(500, "Failed to update fingerprint metadata");
  }
};
