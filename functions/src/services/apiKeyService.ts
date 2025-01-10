import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiKey } from "../types/models";
import { ApiError } from "../utils/error";
import { generateApiKey } from "../utils/key";
import { getCurrentTimestamp, toUnixMillis } from "../utils/timestamp";

// Type for API response that converts Timestamp to Unix time
type ApiKeyResponse = Omit<ApiKey, "createdAt"> & { createdAt: number };

/**
 * Creates a new API key for a fingerprint
 */
export const createApiKey = async (fingerprintId: string): Promise<ApiKeyResponse> => {
  const db = getFirestore();
  const key = generateApiKey();
  const createdAt = getCurrentTimestamp();

  const apiKey: Omit<ApiKey, "id"> = {
    key,
    fingerprintId,
    createdAt,
    active: true,
  };

  const apiKeyRef = await db.collection(COLLECTIONS.API_KEYS).add(apiKey);

  return {
    key,
    fingerprintId,
    active: true,
    id: apiKeyRef.id,
    createdAt: toUnixMillis(createdAt),
  };
};

/**
 * Gets an API key by its key string
 */
export const getApiKeyByKey = async (key: string): Promise<ApiKeyResponse | null> => {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.API_KEYS)
    .where("key", "==", key)
    .where("active", "==", true)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data() as ApiKey;
  return {
    key: data.key,
    fingerprintId: data.fingerprintId,
    active: data.active,
    id: doc.id,
    createdAt: toUnixMillis(data.createdAt),
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
    return {
      key: data.key,
      fingerprintId: data.fingerprintId,
      active: data.active,
      id: doc.id,
      createdAt: toUnixMillis(data.createdAt),
    };
  });
};

/**
 * Validates an API key
 */
export const validateApiKey = async (
  key: string,
): Promise<{ isValid: boolean; needsRefresh: boolean; fingerprintId?: string }> => {
  const apiKey = await getApiKeyByKey(key);

  if (!apiKey) {
    return { isValid: false, needsRefresh: false };
  }

  return {
    isValid: apiKey.active,
    needsRefresh: !apiKey.active,
    fingerprintId: apiKey.fingerprintId,
  };
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
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.API_KEYS)
    .where("key", "==", key)
    .where("active", "==", true)
    .get();

  if (snapshot.empty) {
    throw new ApiError(404, "API key not found");
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  if (data.fingerprintId !== fingerprintId) {
    throw new ApiError(403, "Not authorized to revoke this API key");
  }

  await doc.ref.update({
    active: false,
  });
};
