import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { Impression } from "../types/models.types";
import { ApiError } from "../utils/error";
import { getCurrentTimestamp } from "../utils/timestamp";
import { ERROR_MESSAGES } from "../constants/api";

/**
 * Verifies fingerprint ownership
 */
export const verifyFingerprint = async (
  fingerprintId: string,
  authenticatedId?: string,
): Promise<void> => {
  // First check if fingerprint exists
  const db = getFirestore();
  const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

  if (!fingerprintDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
  }

  if (authenticatedId && fingerprintId !== authenticatedId) {
    throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  }
};

/**
 * Creates a new impression record
 */
export const createImpression = async (
  fingerprintId: string,
  type: string,
  data: Record<string, any>,
  options?: {
    source?: string;
    sessionId?: string;
  },
): Promise<Impression> => {
  const db = getFirestore();
  const createdAt = getCurrentTimestamp();

  const impression: Omit<Impression, "id"> = {
    fingerprintId,
    type,
    data,
    createdAt,
    ...(options?.source && { source: options.source }),
    ...(options?.sessionId && { sessionId: options.sessionId }),
  };

  const impressionRef = await db.collection(COLLECTIONS.IMPRESSIONS).add(impression);

  return {
    id: impressionRef.id,
    ...impression,
  };
};

/**
 * Get impressions for a fingerprint
 */
export const getImpressions = async (
  fingerprintId: string,
  options?: {
    type?: string;
    startTime?: number; // Unix timestamp (milliseconds)
    endTime?: number; // Unix timestamp (milliseconds)
    limit?: number;
    sessionId?: string;
  },
): Promise<Impression[]> => {
  const db = getFirestore();

  let query = db
    .collection(COLLECTIONS.IMPRESSIONS)
    .where("fingerprintId", "==", fingerprintId)
    .orderBy("createdAt", "desc");

  if (options?.type) {
    query = query.where("type", "==", options.type);
  }

  if (options?.sessionId) {
    query = query.where("sessionId", "==", options.sessionId);
  }

  if (options?.startTime) {
    const startTimestamp = new Date(options.startTime);
    query = query.where("createdAt", ">=", startTimestamp);
  }

  if (options?.endTime) {
    const endTimestamp = new Date(options.endTime);
    query = query.where("createdAt", "<=", endTimestamp);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Impression;
  });
};

/**
 * Delete impressions for a fingerprint
 */
export const deleteImpressions = async (
  fingerprintId: string,
  options?: {
    type?: string;
    startTime?: number; // Unix timestamp (milliseconds)
    endTime?: number; // Unix timestamp (milliseconds)
    sessionId?: string;
  },
): Promise<number> => {
  const db = getFirestore();

  let query = db.collection(COLLECTIONS.IMPRESSIONS).where("fingerprintId", "==", fingerprintId);

  if (options?.type) {
    query = query.where("type", "==", options.type);
  }

  if (options?.sessionId) {
    query = query.where("sessionId", "==", options.sessionId);
  }

  if (options?.startTime) {
    const startTimestamp = new Date(options.startTime);
    query = query.where("createdAt", ">=", startTimestamp);
  }

  if (options?.endTime) {
    const endTimestamp = new Date(options.endTime);
    query = query.where("createdAt", "<=", endTimestamp);
  }

  const snapshot = await query.get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return snapshot.size;
};
