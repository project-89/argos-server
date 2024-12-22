import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { ApiError } from "../utils/error";

export interface ApiKeyValidationResult {
  isValid: boolean;
  fingerprintId?: string;
  needsRefresh?: boolean;
}

export const validateApiKey = async (apiKey: string): Promise<ApiKeyValidationResult> => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

    if (snapshot.empty) {
      return {
        isValid: false,
        needsRefresh: false,
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if key is enabled and not expired
    if (!data.enabled) {
      return {
        isValid: false,
        fingerprintId: data.fingerprintId,
        needsRefresh: true,
      };
    }

    // Check expiration
    const expiresAt = data.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return {
        isValid: false,
        fingerprintId: data.fingerprintId,
        needsRefresh: true,
      };
    }

    return {
      isValid: true,
      fingerprintId: data.fingerprintId,
      needsRefresh: false,
    };
  } catch (error) {
    console.error("Error validating API key:", error);
    throw new ApiError(500, "Failed to validate API key");
  }
};

export const revokeApiKey = async (apiKey: string, fingerprintId: string): Promise<void> => {
  const db = getFirestore();
  const keySnapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

  if (keySnapshot.empty) {
    throw new ApiError(404, "API key not found");
  }

  const doc = keySnapshot.docs[0];
  const data = doc.data();

  if (!data.enabled) {
    throw new ApiError(404, "API key is disabled");
  }

  if (data.fingerprintId !== fingerprintId) {
    throw new ApiError(403, "Not authorized to revoke this API key");
  }

  await doc.ref.update({
    enabled: false,
    revokedAt: new Date(),
  });

  // Verify the update
  const updatedDoc = await doc.ref.get();
  const updatedData = updatedDoc.data();

  if (updatedData?.enabled) {
    throw new ApiError(500, "Failed to disable API key");
  }
};
