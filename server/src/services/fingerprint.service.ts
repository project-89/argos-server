import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES, ROLE } from "../constants";
import { Fingerprint } from "../schemas";
import { ApiError, deepMerge } from "../utils";
import {
  createInitialIpMetadata,
  updateIpMetadata as updateIpData,
  updateIpDataInTransaction,
} from "./ip.service";

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
  timestamp: Timestamp;
}): Omit<Fingerprint, "id"> => ({
  fingerprint,
  roles: [ROLE.USER],
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
    const now = Timestamp.now();
    const docData = createFingerprintData({
      fingerprint,
      ip,
      metadata,
      timestamp: now,
    });

    const db = getFirestore();
    const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add(docData);

    return {
      id: fingerprintRef.id,
      ...docData,
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Processes fingerprint document update within a transaction
 */
const processFingerprintUpdate = async ({
  transaction,
  fingerprintRef,
  ip,
}: {
  transaction: FirebaseFirestore.Transaction;
  fingerprintRef: FirebaseFirestore.DocumentReference;
  ip: string;
}): Promise<{ data: Fingerprint }> => {
  const fingerprintDoc = await transaction.get(fingerprintRef);

  if (!fingerprintDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT);
  }

  const data = fingerprintDoc.data() as Fingerprint;
  const { ipAddresses, ipMetadata } = updateIpData({
    currentIpAddresses: data.ipAddresses,
    currentIpMetadata: data.ipMetadata,
    ip,
  });

  updateIpDataInTransaction({
    transaction,
    docRef: fingerprintRef,
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
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);

    return await db.runTransaction((transaction) =>
      processFingerprintUpdate({ transaction, fingerprintRef, ip }),
    );
  } catch (error) {
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
    const db = getFirestore();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.INVALID_FINGERPRINT);
    }

    verifyOwnership({ fingerprintId, authenticatedId });
  } catch (error) {
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
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const data = fingerprintDoc.data() as Fingerprint;
    const updatedMetadata = mergeMetadata({
      existingMetadata: data.metadata,
      newMetadata: metadata,
    });

    await fingerprintRef.update({
      metadata: updatedMetadata,
    });

    return {
      ...data,
      id: fingerprintDoc.id,
      metadata: updatedMetadata,
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Formats fingerprint document data
 */
const formatFingerprintData = (id: string, data: FirebaseFirestore.DocumentData): Fingerprint => ({
  id,
  fingerprint: data.fingerprint,
  roles: data.roles,
  metadata: data.metadata,
  ipAddresses: data.ipAddresses,
  createdAt: data.createdAt,
  lastVisited: data.lastVisited,
  ipMetadata: data.ipMetadata,
  accountId: data.accountId,
  anonUserId: data.anonUserId,
});

/**
 * Gets a fingerprint by ID
 */
export const getFingerprintById = async (fingerprintId: string): Promise<Fingerprint | null> => {
  try {
    const db = getFirestore();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

    if (!fingerprintDoc.exists) {
      return null;
    }

    return formatFingerprintData(fingerprintDoc.id, fingerprintDoc.data()!);
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
