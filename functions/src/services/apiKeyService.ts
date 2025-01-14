import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiKey } from "../types/models";
import { ApiError } from "../utils/error";
import { generateApiKey } from "../utils/api-key";
import { toUnixMillis } from "../utils/timestamp";
import { ApiKeyValidationResponse } from "../types/api.types";

// Type for API response that converts Timestamp to Unix time
type ApiKeyResponse = Omit<ApiKey, "createdAt"> & { createdAt: number };

/**
 * Creates a new API key for a fingerprint
 */
export const createApiKey = async (fingerprintId: string): Promise<ApiKeyResponse> => {
  console.log("[createApiKey] Starting with fingerprintId:", fingerprintId);
  const db = getFirestore();

  try {
    // Check if fingerprint exists
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();
    console.log("[createApiKey] Fingerprint check result:", { exists: fingerprintDoc.exists });

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    // Deactivate any existing API keys for this fingerprint
    const existingKeys = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("fingerprintId", "==", fingerprintId)
      .where("active", "==", true)
      .get();

    console.log("[createApiKey] Found existing keys:", { count: existingKeys.size });

    // Create new API key
    const key = generateApiKey();
    const createdAt = Timestamp.now();

    // Use a batch to ensure atomic operations
    const batch = db.batch();

    // Deactivate existing keys
    existingKeys.docs.forEach((doc) => {
      console.log("[createApiKey] Deactivating key:", { keyId: doc.id });
      batch.update(doc.ref, {
        active: false,
        deactivatedAt: createdAt,
      });
    });

    // Create new key document
    const newKeyRef = db.collection(COLLECTIONS.API_KEYS).doc();
    batch.set(newKeyRef, {
      key,
      fingerprintId,
      active: true,
      createdAt,
    });

    // Commit all changes
    console.log("[createApiKey] Committing batch operation");
    await batch.commit();

    const response = {
      key,
      fingerprintId,
      active: true,
      id: newKeyRef.id,
      createdAt: toUnixMillis(createdAt),
    };
    console.log("[createApiKey] Successfully created key:", { keyId: newKeyRef.id });
    return response;
  } catch (error) {
    console.error("[createApiKey] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      fingerprintId,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to create API key");
  }
};

/**
 * Gets an API key by its key string
 */
export const getApiKeyByKey = async (key: string): Promise<ApiKeyResponse | null> => {
  console.log("[getApiKeyByKey] Starting lookup for key");
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", key).get();

  if (snapshot.empty) {
    console.log("[getApiKeyByKey] Key not found");
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  console.log("[getApiKeyByKey] Found key data:", { keyId: doc.id, active: data.active });

  // Handle different timestamp formats
  let timestamp: Timestamp;
  if (data.createdAt instanceof Timestamp) {
    timestamp = data.createdAt;
  } else if (typeof data.createdAt === "object" && data.createdAt._seconds !== undefined) {
    // Handle raw Firestore timestamp data
    timestamp = new Timestamp(data.createdAt._seconds, data.createdAt._nanoseconds || 0);
  } else if (typeof data.createdAt === "number") {
    timestamp = Timestamp.fromMillis(data.createdAt);
  } else {
    console.error("[getApiKeyByKey] Invalid timestamp format:", data.createdAt);
    timestamp = Timestamp.now(); // Fallback to current time
  }

  return {
    key: data.key,
    fingerprintId: data.fingerprintId,
    active: data.active,
    id: doc.id,
    createdAt: timestamp.toMillis(),
  };
};

/**
 * Gets all API keys for a fingerprint
 */
export const getApiKeys = async (fingerprintId: string): Promise<ApiKeyResponse[]> => {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.API_KEYS)
    .where("fingerprintId", "==", fingerprintId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ApiKey;
    // Ensure we have a valid Firestore Timestamp
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromMillis(data.createdAt);

    return {
      key: data.key,
      fingerprintId: data.fingerprintId,
      active: data.active,
      id: doc.id,
      createdAt: toUnixMillis(createdAt),
    };
  });
};

/**
 * Validates an API key
 */
export const validateApiKey = async (key: string): Promise<ApiKeyValidationResponse> => {
  console.log("[validateApiKey] Starting validation");
  try {
    const apiKey = await getApiKeyByKey(key);
    console.log("[validateApiKey] Key lookup result:", {
      found: !!apiKey,
      active: apiKey?.active,
    });

    if (!apiKey || !apiKey.active) {
      return {
        isValid: false,
        needsRefresh: true,
      };
    }

    return {
      isValid: true,
      needsRefresh: false,
    };
  } catch (error) {
    console.error("[validateApiKey] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, "Failed to validate API key");
  }
};

/**
 * Deactivates an API key
 */
export const deactivateApiKey = async (fingerprintId: string, keyId: string): Promise<void> => {
  const db = getFirestore();
  const keyRef = db.collection(COLLECTIONS.API_KEYS).doc(keyId);
  const keyDoc = await keyRef.get();

  if (!keyDoc.exists) {
    throw new ApiError(404, "API key not found");
  }

  if (keyDoc.data()?.fingerprintId !== fingerprintId) {
    throw new ApiError(403, "API key does not belong to fingerprint");
  }

  await keyRef.update({
    active: false,
  });
};

/**
 * Revokes an API key
 */
export const revokeApiKey = async (key: string, fingerprintId: string): Promise<void> => {
  console.log("[revokeApiKey] Starting revocation:", { fingerprintId });
  try {
    const db = getFirestore();
    const snapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", key).get();
    console.log("[revokeApiKey] Key lookup result:", { found: !snapshot.empty });

    if (snapshot.empty) {
      throw new ApiError(401, "Invalid API key");
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log("[revokeApiKey] Key data:", {
      keyId: doc.id,
      keyFingerprintId: data.fingerprintId,
      active: data.active,
    });

    // Check ownership first
    if (data.fingerprintId !== fingerprintId) {
      throw new ApiError(403, "Not authorized to revoke this API key");
    }

    // Finally revoke
    console.log("[revokeApiKey] Updating key status");
    await doc.ref.update({
      active: false,
      revokedAt: Timestamp.now(),
    });
    console.log("[revokeApiKey] Successfully revoked key");
  } catch (error) {
    console.error("[revokeApiKey] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      fingerprintId,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to revoke API key");
  }
};
