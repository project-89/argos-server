import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { generateApiKey, encryptApiKey } from "../utils/api-key";
import { ApiError } from "../utils/error";

export interface ApiKeyData {
  key: string;
  fingerprintId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  enabled: boolean;
  metadata: {
    name: string;
  };
  revokedAt?: Timestamp;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  fingerprintId?: string;
}

/**
 * Creates a new API key for a fingerprint
 */
export const createApiKey = async (fingerprintId: string): Promise<ApiKeyData> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw new ApiError(404, "Fingerprint not found");
    }

    // Check if fingerprint already has an API key
    const existingKeySnapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("fingerprintId", "==", fingerprintId)
      .where("enabled", "==", true)
      .get();

    // Generate new API key
    const plainApiKey = generateApiKey();
    const encryptedApiKey = encryptApiKey(plainApiKey);

    const apiKeyData: ApiKeyData = {
      key: encryptedApiKey,
      fingerprintId,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days expiration
      enabled: true,
      metadata: {
        name: "Generated API Key",
      },
    };

    // Save encrypted API key
    const apiKeyRef = db.collection(COLLECTIONS.API_KEYS).doc();
    await apiKeyRef.set(apiKeyData);

    // If there was an existing key, disable it
    if (!existingKeySnapshot.empty) {
      const batch = db.batch();
      existingKeySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { enabled: false });
      });
      await batch.commit();
    }

    return apiKeyData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in createApiKey:", error);
    throw new ApiError(500, "Failed to create API key");
  }
};

/**
 * Validates an API key
 */
export const validateApiKey = async (apiKey: string): Promise<ApiKeyValidationResult> => {
  try {
    const db = getFirestore();
    const keySnapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

    if (keySnapshot.empty) {
      return { isValid: false, needsRefresh: false };
    }

    const doc = keySnapshot.docs[0];
    const data = doc.data() as ApiKeyData;

    // Check if key is enabled and not expired
    const isEnabled = data.enabled;
    const isExpired = data.expiresAt.toDate() < new Date();

    return {
      isValid: isEnabled && !isExpired,
      needsRefresh: !isEnabled || isExpired,
      fingerprintId: data.fingerprintId,
    };
  } catch (error) {
    console.error("Error in validateApiKey:", error);
    throw new ApiError(500, "Failed to validate API key");
  }
};

/**
 * Revokes an API key
 */
export const revokeApiKey = async (apiKey: string, fingerprintId: string): Promise<void> => {
  try {
    const db = getFirestore();
    const keySnapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

    if (keySnapshot.empty) {
      throw new ApiError(404, "API key not found");
    }

    const doc = keySnapshot.docs[0];
    const data = doc.data() as ApiKeyData;

    if (!data.enabled) {
      throw new ApiError(404, "API key is disabled");
    }

    if (data.fingerprintId !== fingerprintId) {
      throw new ApiError(403, "Not authorized to revoke this API key");
    }

    await doc.ref.update({
      enabled: false,
      revokedAt: Timestamp.now(),
    });

    // Verify the update
    const updatedDoc = await doc.ref.get();
    const updatedData = updatedDoc.data() as ApiKeyData;

    if (updatedData?.enabled) {
      throw new ApiError(500, "Failed to disable API key");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in revokeApiKey:", error);
    throw new ApiError(500, "Failed to revoke API key");
  }
};

/**
 * Gets an API key by its value
 */
export const getApiKey = async (apiKey: string): Promise<ApiKeyData | null> => {
  try {
    const db = getFirestore();
    const keySnapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

    if (keySnapshot.empty) {
      return null;
    }

    return keySnapshot.docs[0].data() as ApiKeyData;
  } catch (error) {
    console.error("Error in getApiKey:", error);
    throw new ApiError(500, "Failed to get API key");
  }
};

/**
 * Gets all API keys for a fingerprint
 */
export const getApiKeysByFingerprint = async (fingerprintId: string): Promise<ApiKeyData[]> => {
  try {
    const db = getFirestore();
    const keysSnapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("fingerprintId", "==", fingerprintId)
      .get();

    return keysSnapshot.docs.map((doc) => doc.data() as ApiKeyData);
  } catch (error) {
    console.error("Error in getApiKeysByFingerprint:", error);
    throw new ApiError(500, "Failed to get API keys");
  }
};
