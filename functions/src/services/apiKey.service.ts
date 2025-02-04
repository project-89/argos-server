import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections.constants";
import { ApiError } from "../utils/error";
import { generateApiKey } from "../utils/api-key";
import { toUnixMillis } from "../utils/timestamp";

import { ERROR_MESSAGES } from "../constants/api.constants";

/**
 * Creates a new API key for a fingerprint
 */
export const createApiKey = async (
  fingerprintId: string,
): Promise<{
  key: string;
  fingerprintId: string;
  active: boolean;
  id: string;
  createdAt: number;
}> => {
  try {
    console.log("[createApiKey] Starting with fingerprintId:", fingerprintId);
    const db = getFirestore();
    // Check if fingerprint exists
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();
    console.log("[createApiKey] Fingerprint check result:", { exists: fingerprintDoc.exists });

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
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
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_API_KEY);
  }
};

/**
 * Gets an API key by its key string
 */
export const getApiKeyByKey = async (
  key: string,
): Promise<{
  key: string;
  fingerprintId: string;
  active: boolean;
  id: string;
  createdAt: number;
} | null> => {
  try {
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

    return {
      key: data.key,
      fingerprintId: data.fingerprintId,
      active: data.active,
      id: doc.id,
      createdAt: toUnixMillis(data.createdAt),
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_API_KEY);
  }
};

/**
 * Validates an API key
 */
export const validateApiKey = async (
  key: string,
): Promise<{
  isValid: boolean;
  needsRefresh: boolean;
}> => {
  try {
    console.log("[validateApiKey] Starting validation");
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
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VALIDATE_API_KEY);
  }
};

/**
 * Deactivates an API key
 */
export const deactivateApiKey = async ({
  fingerprintId,
  keyId,
}: {
  fingerprintId: string;
  keyId: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const db = getFirestore();
    const keyRef = db.collection(COLLECTIONS.API_KEYS).doc(keyId);
    const keyDoc = await keyRef.get();

    if (!keyDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
    }

    if (keyDoc.data()?.fingerprintId !== fingerprintId) {
      throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const result = await keyRef.update({
      active: false,
    });

    return {
      success: result.writeTime !== undefined,
      message: "API key deactivated successfully",
    };
  } catch (error) {
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DEACTIVATE_API_KEY);
  }
};
