import { Request } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections.constants";
import { ROLE } from "../constants/roles.constants";
import { ERROR_MESSAGES } from "../constants/api.constants";

import { Fingerprint } from "@/types";
import { ApiError } from "../utils/error";
import { deepMerge } from "../utils/object";

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
export const createFingerprint = async ({
  fingerprint,
  ip,
  metadata,
}: {
  fingerprint: string;
  ip: string;
  metadata?: Record<string, any>;
}): Promise<Fingerprint> => {
  const now = Timestamp.now();
  const docData: Omit<Fingerprint, "id"> = {
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
      suspiciousIps: [],
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
export const getFingerprintAndUpdateIp = async ({
  fingerprintId,
  ip,
}: {
  fingerprintId: string;
  ip: string;
}): Promise<{ data: Fingerprint }> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);

  try {
    const updatedDoc = await db.runTransaction(async (transaction) => {
      const fingerprintDoc = await transaction.get(fingerprintRef);

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
      }

      const data = fingerprintDoc.data() as Fingerprint;

      const ipAddresses = data.ipAddresses || [];
      const ipMetadata = data.ipMetadata || {
        ipFrequency: {},
        lastSeenAt: {},
        primaryIp: undefined,
      };

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
    console.error(`[Fingerprint ${fingerprintId}] Error updating IP:`, error);
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Verifies fingerprint exists and ownership
 */
export const verifyFingerprint = async ({
  fingerprintId,
  authenticatedId,
}: {
  fingerprintId: string;
  authenticatedId?: string;
}): Promise<void> => {
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
export const updateFingerprintMetadata = async ({
  fingerprintId,
  metadata,
}: {
  fingerprintId: string;
  metadata: Record<string, any>;
}): Promise<Fingerprint> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);

  try {
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as Fingerprint;
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
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
