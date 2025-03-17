import { COLLECTIONS, ERROR_MESSAGES, ACCOUNT_ROLE } from "../constants";
import { Fingerprint } from "../schemas";
import { ApiError, deepMerge } from "../utils";
import { getDb, toObjectId, formatDocument, formatDocuments } from "../utils/mongodb";
import {
  createInitialIpMetadata,
  updateIpMetadata as updateIpData,
  updateIpDataInTransaction,
} from "./ip.service";

const LOG_PREFIX = "[Fingerprint Service]";

/**
 * Creates the base fingerprint document data
 */
const createFingerprintData = ({
  fingerprint,
  ip,
  metadata,
  timestamp,
}: {
  fingerprint: string;
  ip: string;
  metadata?: Record<string, any>;
  timestamp: number;
}): Omit<Fingerprint, "id"> => ({
  fingerprint,
  roles: [ACCOUNT_ROLE.user],
  createdAt: timestamp,
  lastVisited: timestamp,
  metadata,
  ipAddresses: [ip],
  ipMetadata: createInitialIpMetadata({ ip, timestamp }),
});

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
  try {
    const now = Date.now();
    const docData = createFingerprintData({
      fingerprint,
      ip,
      metadata,
      timestamp: now,
    });

    const db = await getDb();
    const result = await db.collection(COLLECTIONS.FINGERPRINTS).insertOne(docData);

    return {
      id: result.insertedId.toString(),
      ...docData,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating fingerprint:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Processes fingerprint update within a transaction
 */
const processFingerprintUpdate = async ({
  session,
  fingerprintId,
  ip,
}: {
  session: any;
  fingerprintId: string;
  ip: string;
}): Promise<{ data: Fingerprint }> => {
  const db = await getDb();
  const fingerprintsCollection = db.collection(COLLECTIONS.FINGERPRINTS);

  const fingerprintDoc = await fingerprintsCollection.findOne(
    { _id: toObjectId(fingerprintId) },
    { session },
  );

  if (!fingerprintDoc) {
    throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
  }

  const data = formatDocument(fingerprintDoc) as Fingerprint;
  const { ipAddresses, ipMetadata } = updateIpData({
    currentIpAddresses: data.ipAddresses,
    currentIpMetadata: data.ipMetadata,
    ip,
  });

  updateIpDataInTransaction({
    session,
    collection: fingerprintsCollection,
    docId: fingerprintId,
    ipAddresses,
    ipMetadata,
  });

  return {
    data: {
      ...data,
      ipAddresses,
      ipMetadata,
    },
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
  try {
    const db = await getDb();
    const session = db.client.startSession();

    try {
      let result;
      await session.withTransaction(async () => {
        result = await processFingerprintUpdate({ session, fingerprintId, ip });
      });
      return result;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating fingerprint IP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Verifies fingerprint ownership
 */
const verifyOwnership = ({
  fingerprintId,
  authenticatedId,
}: {
  fingerprintId: string;
  authenticatedId?: string;
}): void => {
  if (authenticatedId && fingerprintId !== authenticatedId) {
    throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
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
  try {
    const db = await getDb();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).findOne({
      _id: toObjectId(fingerprintId),
    });

    if (!fingerprintDoc) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.INVALID_FINGERPRINT);
    }

    verifyOwnership({ fingerprintId, authenticatedId });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error verifying fingerprint:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Merges new metadata with existing metadata
 */
const mergeMetadata = ({
  existingMetadata = {},
  newMetadata,
}: {
  existingMetadata?: Record<string, any>;
  newMetadata: Record<string, any>;
}): Record<string, any> => deepMerge(existingMetadata, newMetadata);

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
  try {
    const db = await getDb();
    const fingerprintsCollection = db.collection(COLLECTIONS.FINGERPRINTS);
    const fingerprintDoc = await fingerprintsCollection.findOne({ _id: toObjectId(fingerprintId) });

    if (!fingerprintDoc) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = formatDocument(fingerprintDoc) as Fingerprint;
    const updatedMetadata = mergeMetadata({
      existingMetadata: data.metadata,
      newMetadata: metadata,
    });

    await fingerprintsCollection.updateOne(
      { _id: toObjectId(fingerprintId) },
      { $set: { metadata: updatedMetadata } },
    );

    return {
      ...data,
      metadata: updatedMetadata,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating fingerprint metadata:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Gets a fingerprint by ID
 */
export const getFingerprintById = async (fingerprintId: string): Promise<Fingerprint | null> => {
  try {
    const db = await getDb();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).findOne({
      _id: toObjectId(fingerprintId),
    });

    if (!fingerprintDoc) {
      return null;
    }

    return formatDocument(fingerprintDoc) as Fingerprint;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting fingerprint by ID:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
