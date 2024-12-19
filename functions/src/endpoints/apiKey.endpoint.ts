import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { generateApiKey, encryptApiKey } from "../utils/api-key";
import { validateRequest } from "../middleware/validation.middleware";
import { schemas } from "../types/schemas";

// Internal validation function
export const validateApiKey = async (
  encryptedApiKey: string,
): Promise<{ isValid: boolean; fingerprintId?: string }> => {
  try {
    const db = getFirestore();

    // Query for the API key using encrypted key
    const snapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("key", "==", encryptedApiKey)
      .get();

    if (snapshot.empty) {
      console.warn("API key not found");
      return { isValid: false };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if key is enabled and not expired
    if (!data.enabled) {
      console.warn("API key is disabled");
      return { isValid: false };
    }

    const expiresAt = data.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) {
      console.warn("API key is expired");
      // Disable expired key
      await doc.ref.update({
        enabled: false,
        disabledAt: new Date(),
        disabledReason: "expired",
      });
      return { isValid: false };
    }

    console.log("API key data found:", {
      fingerprintId: data.fingerprintId,
      enabled: data.enabled,
      createdAt: data.createdAt?.toDate?.(),
      expiresAt: data.expiresAt?.toDate?.(),
      metadata: data.metadata,
    });

    return {
      isValid: true,
      fingerprintId: data.fingerprintId,
    };
  } catch (error) {
    console.error("Error validating API key:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { isValid: false };
  }
};

export const register = [
  validateRequest(schemas.apiKeyRegister),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fingerprintId } = req.body;

      // Verify fingerprint exists
      const db = getFirestore();
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
      const fingerprintDoc = await fingerprintRef.get();

      if (!fingerprintDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
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

      // Save encrypted API key (server-side)
      const apiKeyRef = db.collection(COLLECTIONS.API_KEYS).doc();
      await apiKeyRef.set({
        key: encryptedApiKey, // Store encrypted key in database
        fingerprintId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiration
        enabled: true,
        metadata: {
          name: "Generated API Key",
        },
      });

      // If there was an existing key, disable it
      if (!existingKeySnapshot.empty) {
        const batch = db.batch();
        existingKeySnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { enabled: false });
        });
        await batch.commit();
      }

      // Return encrypted key to client
      return res.status(200).json({
        success: true,
        data: {
          key: encryptedApiKey,
          fingerprintId,
        },
      });
    } catch (error: any) {
      console.error("Error in register API key:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to register API key",
      });
    }
  },
];

// HTTP endpoint for validation
export const validate = [
  validateRequest(schemas.apiKeyValidate),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key: encryptedKey } = req.body;
      const result = await validateApiKey(encryptedKey);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Error in validate API key endpoint:", {
        error,
        message: error.message,
        stack: error.stack,
        body: req.body,
      });
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to validate API key",
      });
    }
  },
];

export const revoke = [
  validateRequest(schemas.apiKeyRevoke),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key: encryptedKey } = req.body;

      const db = getFirestore();

      // First check if the key exists at all
      const keySnapshot = await db
        .collection(COLLECTIONS.API_KEYS)
        .where("key", "==", encryptedKey)
        .get();

      if (keySnapshot.empty) {
        return res.status(404).json({
          success: false,
          error: "API key not found",
        });
      }

      const doc = keySnapshot.docs[0];
      const data = doc.data();

      // Check if key is already disabled
      if (!data.enabled) {
        return res.status(404).json({
          success: false,
          error: "API key not found or already revoked",
        });
      }

      // Check if the API key belongs to the authenticated user
      if (data.fingerprintId !== req.fingerprintId) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to revoke this API key",
        });
      }

      // Disable the API key
      await doc.ref.update({
        enabled: false,
        revokedAt: new Date(),
      });

      // Wait for write to be committed and verify the key was actually disabled
      const updatedDoc = await doc.ref.get();
      const updatedData = updatedDoc.data();

      if (updatedData?.enabled) {
        throw new Error("Failed to disable API key");
      }

      // Double check the key is actually disabled in a new query
      const verifySnapshot = await db
        .collection(COLLECTIONS.API_KEYS)
        .where("key", "==", encryptedKey)
        .get();

      if (!verifySnapshot.empty) {
        const verifyData = verifySnapshot.docs[0].data();
        if (verifyData.enabled) {
          throw new Error("Failed to persist API key disabled state");
        }
      }

      return res.status(200).json({
        success: true,
        message: "API key revoked successfully",
      });
    } catch (error: any) {
      console.error("Error in revoke API key:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to revoke API key",
      });
    }
  },
];
