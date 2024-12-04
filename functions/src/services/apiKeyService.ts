import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import crypto from "crypto";
import { ApiKey } from "@/types";

interface CreateApiKeyParams {
  name: string;
  fingerprintId: string;
  metadata?: Record<string, any>;
}

interface ValidateApiKeyResult {
  isValid: boolean;
  fingerprintId?: string;
}

interface ApiKeyDoc extends Omit<ApiKey, "createdAt" | "lastUsed"> {
  createdAt: Timestamp | FieldValue;
  lastUsed: Timestamp | FieldValue | null;
}

export const createApiKey = async ({
  name,
  fingerprintId,
  metadata = {},
}: CreateApiKeyParams): Promise<string> => {
  const db = getFirestore();

  const existingKeys = await db
    .collection("apiKeys")
    .where("fingerprintId", "==", fingerprintId)
    .get();

  if (!existingKeys.empty) {
    throw new Error("Fingerprint already has an associated API key");
  }

  const key = crypto.randomBytes(32).toString("hex");

  const keyExists = await db.collection("apiKeys").doc(key).get();
  if (keyExists.exists) {
    return createApiKey({ name, fingerprintId, metadata });
  }

  const keyDoc: ApiKeyDoc = {
    name,
    fingerprintId,
    key,
    createdAt: FieldValue.serverTimestamp(),
    lastUsed: null,
    enabled: true,
    metadata,
    usageCount: 0,
    endpointStats: {},
  };

  await db.runTransaction(async (transaction) => {
    const fingerprintRef = db.collection("fingerprints").doc(fingerprintId);
    const fingerprintDoc = await transaction.get(fingerprintRef);

    if (!fingerprintDoc.exists) {
      throw new Error("Fingerprint not found");
    }

    const fingerprintData = fingerprintDoc.data();
    if (fingerprintData?.apiKeys?.includes(key)) {
      throw new Error("Fingerprint already has this API key");
    }

    transaction.set(db.collection("apiKeys").doc(key), keyDoc);

    transaction.update(fingerprintRef, {
      apiKeys: FieldValue.arrayUnion(key),
    });
  });

  return key;
};

export const validateApiKey = async (
  key: string,
  endpoint: string,
): Promise<ValidateApiKeyResult> => {
  const db = getFirestore();

  const keyDoc = await db.collection("apiKeys").doc(key).get();

  if (!keyDoc.exists || !keyDoc.data()?.enabled) {
    return {
      isValid: false,
    };
  }

  const data = keyDoc.data() as ApiKey;

  await keyDoc.ref.update({
    lastUsed: FieldValue.serverTimestamp(),
    usageCount: FieldValue.increment(1),
    [`endpointStats.${endpoint}`]: FieldValue.increment(1),
  });

  return {
    isValid: true,
    fingerprintId: data.fingerprintId,
  };
};
