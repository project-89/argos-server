import { COLLECTIONS, ERROR_MESSAGES, ACCOUNT_ROLE } from "../constants";
import { Fingerprint, FingerprintResponse } from "../schemas";
import { ApiError, deepMerge, idFilter } from "../utils";
import {
  getDb,
  formatDocument,
  startSession,
  commitTransaction,
  abortTransaction,
} from "../utils/mongodb";
import {
  createInitialIpMetadata,
  updateIpMetadata as updateIpData,
  updateIpDataInTransaction,
} from "./ip.service";

const LOG_PREFIX = "[Fingerprint Service]";
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

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
  console.log(`${LOG_PREFIX} Creating fingerprint`);

  try {
    const db = await getDb();

    // Check if this fingerprint already exists
    const existingFingerprint = await db
      .collection(COLLECTIONS.FINGERPRINTS)
      .findOne({ fingerprint });

    if (existingFingerprint) {
      console.log(`${LOG_PREFIX} Fingerprint already exists`);
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_EXISTS);
    }

    const now = new Date();

    // Create new fingerprint with appropriate types
    const newFingerprint: Omit<Fingerprint, "id"> = {
      fingerprint,
      roles: [ACCOUNT_ROLE.user],
      createdAt: now.getTime(),
      lastVisited: now.getTime(),
      ipAddresses: [ip],
      ipMetadata: createInitialIpMetadata({ ip, timestamp: now.getTime() }),
      metadata: metadata || {},
    };

    const result = await db.collection(COLLECTIONS.FINGERPRINTS).insertOne(newFingerprint);

    if (!result.acknowledged) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    const insertedId = result.insertedId.toString();

    return {
      ...newFingerprint,
      id: insertedId,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating fingerprint:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
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

  const filter = idFilter(fingerprintId);
  if (!filter) {
    throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
  }

  const fingerprintDoc = await fingerprintsCollection.findOne(filter, {
    session,
  });

  if (!fingerprintDoc) {
    throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
  }

  const data = formatDocument<Fingerprint>(fingerprintDoc);
  if (!data) {
    throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
  }

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
    // Use our new session management functions
    const session = await startSession();
    let result: { data: Fingerprint } | undefined;

    try {
      session.startTransaction();
      result = await processFingerprintUpdate({ session, fingerprintId, ip });
      await commitTransaction(session);
      return result;
    } catch (error) {
      await abortTransaction(session);
      throw error;
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
    const filter = idFilter(fingerprintId);
    if (!filter) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.INVALID_FINGERPRINT);
    }

    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).findOne(filter);

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

    const filter = idFilter(fingerprintId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const fingerprintDoc = await fingerprintsCollection.findOne(filter);

    if (!fingerprintDoc) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = formatDocument<Fingerprint>(fingerprintDoc);
    if (!data) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    const updatedMetadata = mergeMetadata({
      existingMetadata: data.metadata,
      newMetadata: metadata,
    });

    await fingerprintsCollection.updateOne(filter, {
      $set: { metadata: updatedMetadata },
    });

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
export const getFingerprintById = async (fingerprintId: string): Promise<FingerprintResponse> => {
  console.log(`${LOG_PREFIX} Getting fingerprint by ID: ${fingerprintId}`);

  try {
    const db = await getDb();

    const filter = idFilter(fingerprintId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const fingerprint = await db.collection(COLLECTIONS.FINGERPRINTS).findOne(filter);

    if (!fingerprint) {
      console.log(`${LOG_PREFIX} Fingerprint not found: ${fingerprintId}`);
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const formattedFingerprint = formatDocument<Fingerprint>(fingerprint);
    if (!formattedFingerprint) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    return {
      data: formattedFingerprint,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting fingerprint:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_FINGERPRINT);
  }
};

/**
 * Get a fingerprint by its fingerprint string
 */
export const getFingerprintByValue = async (
  fingerprintValue: string,
): Promise<FingerprintResponse | null> => {
  console.log(`${LOG_PREFIX} Getting fingerprint by value`);

  try {
    const db = await getDb();
    const session = await startSession();
    let result: FingerprintResponse | null = null;

    try {
      session.startTransaction();

      const fingerprint = await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .findOne({ fingerprint: fingerprintValue }, { session });

      if (!fingerprint) {
        await commitTransaction(session);
        return null;
      }

      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .updateOne(
          { fingerprint: fingerprintValue },
          { $set: { lastVisited: new Date() } },
          { session },
        );

      const formattedFingerprint = formatDocument<Fingerprint>(fingerprint);
      if (formattedFingerprint) {
        result = {
          data: formattedFingerprint,
        };
      }

      await commitTransaction(session);
      return result;
    } catch (error) {
      await abortTransaction(session);
      throw error;
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting fingerprint by value:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_FINGERPRINT);
  }
};

/**
 * Update a fingerprint
 */
export const updateFingerprint = async (
  fingerprintId: string,
  update: Partial<Fingerprint>,
): Promise<FingerprintResponse> => {
  console.log(`${LOG_PREFIX} Updating fingerprint: ${fingerprintId}`);

  try {
    const db = await getDb();
    const filter = idFilter(fingerprintId);

    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Check if the fingerprint exists
    const existingFingerprint = await db.collection(COLLECTIONS.FINGERPRINTS).findOne(filter);

    if (!existingFingerprint) {
      console.log(`${LOG_PREFIX} Fingerprint not found: ${fingerprintId}`);
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const updateData = {
      ...update,
      updatedAt: new Date().getTime(),
    };

    await db.collection(COLLECTIONS.FINGERPRINTS).updateOne(filter, { $set: updateData });

    // Get the updated fingerprint
    const updatedFingerprint = await db.collection(COLLECTIONS.FINGERPRINTS).findOne(filter);

    if (!updatedFingerprint) {
      throw new ApiError(500, ERROR_MESSAGES.FAILED_TO_UPDATE_FINGERPRINT);
    }

    const formattedFingerprint = formatDocument<Fingerprint>(updatedFingerprint);
    if (!formattedFingerprint) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    return {
      data: formattedFingerprint,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating fingerprint:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_FINGERPRINT);
  }
};

/**
 * Update a fingerprint's IP address
 */
export const updateFingerprintIp = async (
  fingerprintId: string,
  ipAddress: string,
): Promise<void> => {
  console.log(`${LOG_PREFIX} Updating fingerprint IP: ${fingerprintId}, ${ipAddress}`);

  try {
    const db = await getDb();
    const fingerprintsCollection = db.collection(COLLECTIONS.FINGERPRINTS);

    const filter = idFilter(fingerprintId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Find the existing fingerprint
    const fingerprintDoc = await fingerprintsCollection.findOne(filter);

    if (!fingerprintDoc) {
      console.log(`${LOG_PREFIX} Fingerprint not found: ${fingerprintId}`);
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Update the fingerprint's IP addresses and related metadata
    const existingIps = fingerprintDoc.ipAddresses || [];
    let ipMetadata = fingerprintDoc.ipMetadata || {
      ipFrequency: {},
      lastSeenAt: {},
      suspiciousIps: [],
    };

    // Update IP frequency
    ipMetadata.ipFrequency = ipMetadata.ipFrequency || {};
    ipMetadata.ipFrequency[ipAddress] = (ipMetadata.ipFrequency[ipAddress] || 0) + 1;

    // Update last seen timestamps
    ipMetadata.lastSeenAt = ipMetadata.lastSeenAt || {};
    ipMetadata.lastSeenAt[ipAddress] = Date.now();

    // Add IP to list if it doesn't exist
    if (!existingIps.includes(ipAddress)) {
      existingIps.push(ipAddress);
    }

    // Determine primary IP based on frequency
    type IpFrequency = { ip: string; frequency: number };

    // Properly initialize the accumulator
    const initialValue: IpFrequency = { ip: "", frequency: 0 };

    const primaryIp = Object.entries(ipMetadata.ipFrequency || {}).reduce(
      (max: IpFrequency, entry) => {
        const ip = entry[0];
        const frequency = Number(entry[1]);
        return frequency > max.frequency ? { ip, frequency } : max;
      },
      initialValue,
    ).ip;

    if (primaryIp) {
      ipMetadata.primaryIp = primaryIp;
    }

    // Check for suspicious behavior (multiple IPs in short timeframe)
    const suspiciousThreshold = 3; // Flag as suspicious if more than 3 IPs in an hour
    const recentIps = Object.entries(ipMetadata.lastSeenAt)
      .filter(([_, timestamp]) => {
        // Ensure timestamp is a number
        const numTimestamp = typeof timestamp === "number" ? timestamp : Number(timestamp);
        return Date.now() - numTimestamp < ONE_HOUR_IN_MS;
      })
      .map(([ip]) => ip);

    if (recentIps.length > suspiciousThreshold) {
      // Add new IPs to suspicious list
      recentIps.forEach((ip) => {
        if (!ipMetadata.suspiciousIps.includes(ip)) {
          ipMetadata.suspiciousIps.push(ip);
        }
      });
    }

    // Update the fingerprint
    await fingerprintsCollection.updateOne(filter, {
      $set: {
        ipAddresses: existingIps,
        ipMetadata,
        lastVisited: new Date().getTime(),
      },
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating fingerprint IP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_FINGERPRINT);
  }
};
