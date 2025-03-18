import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Impression } from "../schemas";
import { ApiError } from "../utils";
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";
import { stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Impression Service]";

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
    metadata?: Record<string, unknown>;
  };
}): Promise<Impression> => {
  try {
    const db = await getDb();
    const now = Date.now();

    const impression: Omit<Impression, "id"> = {
      fingerprintId,
      type,
      data,
      createdAt: now,
      ...(options?.source && { source: options.source }),
      ...(options?.sessionId && { sessionId: options.sessionId }),
      ...(options?.metadata && { metadata: options.metadata }),
    };

    const result = await db.collection(COLLECTIONS.IMPRESSIONS).insertOne(impression);

    if (!result.acknowledged || !result.insertedId) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    return {
      id: result.insertedId.toString(),
      ...impression,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in createImpression:`, error);
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
    const db = await getDb();

    // Build query
    const query: Record<string, any> = {
      ...stringIdFilter("fingerprintId", fingerprintId),
    };

    if (options?.type) {
      query.type = options.type;
    }

    if (options?.sessionId) {
      query.sessionId = options.sessionId;
    }

    if (options?.startTime || options?.endTime) {
      query.createdAt = {};
      if (options?.startTime) {
        query.createdAt.$gte = options.startTime;
      }
      if (options?.endTime) {
        query.createdAt.$lte = options.endTime;
      }
    }

    // Execute query
    let cursor = db.collection(COLLECTIONS.IMPRESSIONS).find(query).sort({ createdAt: -1 }); // descending order

    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    const impressions = await cursor.toArray();
    return formatDocuments(impressions);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getImpressions:`, error);
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
    const db = await getDb();

    // Build query
    const query: Record<string, any> = {
      ...stringIdFilter("fingerprintId", fingerprintId),
    };

    if (options?.type) {
      query.type = options.type;
    }

    if (options?.sessionId) {
      query.sessionId = options.sessionId;
    }

    if (options?.startTime || options?.endTime) {
      query.createdAt = {};
      if (options?.startTime) {
        query.createdAt.$gte = options.startTime;
      }
      if (options?.endTime) {
        query.createdAt.$lte = options.endTime;
      }
    }

    // Execute deletion
    const result = await db.collection(COLLECTIONS.IMPRESSIONS).deleteMany(query);

    if (!result.acknowledged) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    return result.deletedCount;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in deleteImpressions:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
