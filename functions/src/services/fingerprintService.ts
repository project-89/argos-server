import { Request } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ROLE } from "../constants/roles";

import { Fingerprint } from "../types/models";
import { ApiError } from "../utils/error";
import { deepMerge } from "../utils/object";

const SUSPICIOUS_IP_THRESHOLD = 10; // Number of requests needed from an IP to establish it as trusted
const SUSPICIOUS_TIME_WINDOW =
  process.env.FUNCTIONS_EMULATOR === "true"
    ? 100 // 100ms for testing
    : 24 * 60 * 60 * 1000; // 24 hours in milliseconds for production

export interface FingerprintDocData extends Omit<Fingerprint, "createdAt" | "ipMetadata"> {
  id: string;
  createdAt: Timestamp;
  ipMetadata: {
    primaryIp?: string;
    ipFrequency: Record<string, number>;
    lastSeenAt: Record<string, Timestamp>;
    suspiciousIps: string[];
  };
}

export interface FingerprintWithSuspicious extends FingerprintDocData {
  isSuspicious?: boolean;
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
export const getFingerprintAndUpdateIp = async (
  id: string,
  ip: string,
): Promise<{ data: FingerprintDocData; isSuspicious: boolean }> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(id);

  try {
    const updatedDoc = await db.runTransaction(async (transaction) => {
      const fingerprintDoc = await transaction.get(fingerprintRef);

      if (!fingerprintDoc.exists) {
        throw new ApiError(404, "Fingerprint not found");
      }

      const data = fingerprintDoc.data() as FingerprintDocData;
      const ipAddresses = data.ipAddresses || [];
      const ipMetadata = data.ipMetadata || {
        ipFrequency: {},
        lastSeenAt: {},
        suspiciousIps: [],
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
      const [primaryIp, primaryFrequency] = Object.entries(ipMetadata.ipFrequency).reduce((a, b) =>
        a[1] > b[1] ? a : b,
      );
      ipMetadata.primaryIp = primaryIp;

      // Check for suspicious activity
      let isSuspicious = false;
      if (!ipAddresses.includes(ip)) {
        // New IP address detected
        ipAddresses.push(ip);

        // Check if this IP is suspicious
        const isPrimaryEstablished = primaryFrequency >= SUSPICIOUS_IP_THRESHOLD;
        const timeSinceCreation = Date.now() - data.createdAt.toMillis();
        const isWithinInitialWindow = timeSinceCreation <= SUSPICIOUS_TIME_WINDOW;

        console.log(`[Fingerprint ${id}] New IP detected:`, {
          ip,
          primaryIp,
          primaryFrequency,
          isPrimaryEstablished,
          isWithinInitialWindow,
          createdAt: data.createdAt.toMillis(),
          now: Date.now(),
          timeDiff: timeSinceCreation,
          timeWindow: SUSPICIOUS_TIME_WINDOW,
          environment: {
            isEmulator: process.env.FUNCTIONS_EMULATOR === "true",
          },
        });

        if (isPrimaryEstablished && !isWithinInitialWindow) {
          isSuspicious = true;
          if (!ipMetadata.suspiciousIps.includes(ip)) {
            ipMetadata.suspiciousIps.push(ip);
            console.warn(
              `[Fingerprint ${id}] Suspicious IP detected: ${ip} (primary: ${primaryIp}, freq: ${primaryFrequency}, timeSince: ${timeSinceCreation}ms)`,
            );
          }
        }
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
        isSuspicious,
      };
    });

    return updatedDoc;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in getFingerprintAndUpdateIp:", error);
    throw new ApiError(500, "Failed to get fingerprint");
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
    throw new ApiError(404, "Fingerprint not found");
  }

  if (authenticatedId && fingerprintId !== authenticatedId) {
    throw new ApiError(403, "API key does not match fingerprint");
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
    console.log("Existing fingerprint data:", JSON.stringify(data, null, 2));
    console.log("Existing metadata:", JSON.stringify(data.metadata, null, 2));
    console.log("New metadata:", JSON.stringify(metadata, null, 2));
    const updatedMetadata = deepMerge(data.metadata || {}, metadata);
    console.log("Merged metadata:", JSON.stringify(updatedMetadata, null, 2));

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
