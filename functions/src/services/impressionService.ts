import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { Impression } from "../types/models";
import { ApiError } from "../utils/error";

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

  const impression: Omit<Impression, "id"> = {
    fingerprintId,
    type,
    data,
    createdAt: Timestamp.now(),
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
    startTime?: Date;
    endTime?: Date;
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
    query = query.where("createdAt", ">=", Timestamp.fromDate(options.startTime));
  }

  if (options?.endTime) {
    query = query.where("createdAt", "<=", Timestamp.fromDate(options.endTime));
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Impression,
  );
};

/**
 * Delete impressions for a fingerprint
 */
export const deleteImpressions = async (
  fingerprintId: string,
  options?: {
    type?: string;
    startTime?: Date;
    endTime?: Date;
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
    query = query.where("createdAt", ">=", Timestamp.fromDate(options.startTime));
  }

  if (options?.endTime) {
    query = query.where("createdAt", "<=", Timestamp.fromDate(options.endTime));
  }

  const snapshot = await query.get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return snapshot.size;
};
