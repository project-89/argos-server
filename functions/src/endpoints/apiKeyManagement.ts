import { Request, Response } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants";
import { generateApiKey, isValidApiKeyFormat } from "@/utils/apiKey";
import { ApiKey } from "@/types";

export interface RegisterApiKeyParams {
  name: string;
  fingerprintId: string;
  metadata?: Record<string, any>;
}

export interface ApiKeyResponse {
  key: string;
  name: string;
  fingerprintId: string;
  id: string;
}

/**
 * HTTP endpoint handler for registering a new API key
 */
export const registerApiKeyEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, fingerprintId, metadata = {} } = req.body;

    if (!name || !fingerprintId) {
      res.status(400).json({ error: "Missing required fields: name, fingerprintId" });
      return;
    }

    const result = await registerApiKey({ name, fingerprintId, metadata });
    res.status(200).json({
      success: true,
      apiKey: result.key,
      fingerprintId: result.fingerprintId,
      message: "Store this API key safely - it won't be shown again",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Registers a new API key for a fingerprint
 */
export const registerApiKey = async ({
  name,
  fingerprintId,
  metadata = {},
}: RegisterApiKeyParams): Promise<ApiKeyResponse> => {
  if (!name || !fingerprintId) {
    throw new Error("Missing required fields: name, fingerprintId");
  }

  const db = getFirestore();

  // Verify fingerprint exists
  const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();
  if (!fingerprintDoc.exists) {
    throw new Error("Fingerprint not found");
  }

  // Check if fingerprint already has an API key
  const existingKeys = await db
    .collection(COLLECTIONS.API_KEYS)
    .where("fingerprintId", "==", fingerprintId)
    .get();

  if (!existingKeys.empty) {
    throw new Error("Fingerprint already has an associated API key");
  }

  // Generate unique API key
  const key = generateApiKey();

  // Validate key format
  if (!isValidApiKeyFormat(key)) {
    throw new Error("Generated API key failed validation");
  }

  // Create API key record
  const apiKeyRef = await db.collection(COLLECTIONS.API_KEYS).add({
    key,
    name,
    fingerprintId,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
    lastUsed: null,
    enabled: true,
    usageCount: 0,
    endpointStats: {},
  });

  const doc = await apiKeyRef.get();
  const data = doc.data() as ApiKey;

  return {
    key: data.key,
    name: data.name,
    fingerprintId: data.fingerprintId,
    id: doc.id,
  };
};

/**
 * Validates an API key and returns the associated fingerprint ID
 */
export const validateApiKey = async (
  key: string,
): Promise<{ isValid: boolean; fingerprintId?: string }> => {
  if (!isValidApiKeyFormat(key)) {
    return { isValid: false };
  }

  const db = getFirestore();
  const apiKeys = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", key).get();

  if (apiKeys.empty) {
    return { isValid: false };
  }

  const apiKey = apiKeys.docs[0].data() as ApiKey;
  return {
    isValid: apiKey.enabled,
    fingerprintId: apiKey.enabled ? apiKey.fingerprintId : undefined,
  };
};

/**
 * Disables an API key
 */
export const disableApiKey = async (key: string): Promise<void> => {
  if (!isValidApiKeyFormat(key)) {
    throw new Error("Invalid API key format");
  }

  const db = getFirestore();
  const apiKeys = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", key).get();

  if (apiKeys.empty) {
    throw new Error("API key not found");
  }

  await apiKeys.docs[0].ref.update({
    enabled: false,
    lastUsed: FieldValue.serverTimestamp(),
  });
};

/**
 * Updates API key usage statistics
 */
export const updateApiKeyStats = async (key: string, endpoint: string): Promise<void> => {
  if (!isValidApiKeyFormat(key)) {
    throw new Error("Invalid API key format");
  }

  const db = getFirestore();
  const apiKeys = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", key).get();

  if (apiKeys.empty) {
    throw new Error("API key not found");
  }

  await apiKeys.docs[0].ref.update({
    lastUsed: FieldValue.serverTimestamp(),
    usageCount: FieldValue.increment(1),
    [`endpointStats.${endpoint}`]: FieldValue.increment(1),
  });
};
