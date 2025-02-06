import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Impression } from "../types";
import { ApiError } from "../utils";

/**
 * Creates a new impression record
 */
export const createImpression = async ({
  fingerprintId,
  type,
  data,
  options,
}: {
  fingerprintId: string;
  type: string;
  data: Record<string, any>;
  options?: {
    source?: string;
    sessionId?: string;
  };
}): Promise<Impression> => {
  try {
    const db = getFirestore();
    const createdAt = Timestamp.now();

    const impression: Omit<Impression, "id"> = {
      fingerprintId,
      type,
      data,
      createdAt,
      ...(options?.source && { source: options.source }),
      ...(options?.sessionId && { sessionId: options.sessionId }),
    };

    const impressionRef = await db.collection(COLLECTIONS.IMPRESSIONS).add(impression);

    if (!impressionRef.id) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    return {
      id: impressionRef.id,
      ...impression,
    };
  } catch (error) {
    console.error("Error in createImpression:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get impressions for a fingerprint
 */
export const getImpressions = async ({
  fingerprintId,
  options,
}: {
  fingerprintId: string;
  options?: {
    type?: string;
    startTime?: number; // Unix timestamp (milliseconds)
    endTime?: number; // Unix timestamp (milliseconds)
    limit?: number;
    sessionId?: string;
  };
}): Promise<Impression[]> => {
  try {
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
  } catch (error) {
    console.error("Error in getImpressions:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Delete impressions for a fingerprint
 */
export const deleteImpressions = async ({
  fingerprintId,
  options,
}: {
  fingerprintId: string;
  options?: {
    type?: string;
    startTime?: number; // Unix timestamp (milliseconds)
    endTime?: number; // Unix timestamp (milliseconds)
    sessionId?: string;
  };
}): Promise<number> => {
  try {
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
  } catch (error) {
    console.error("Error in deleteImpressions:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
