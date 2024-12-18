import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { generateApiKey } from "../utils/api-key";

// Internal validation function
export const validateApiKey = async (
  apiKey: string,
): Promise<{ isValid: boolean; fingerprintId?: string }> => {
  try {
    const db = getFirestore();

    // Query for the API key
    const snapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("key", "==", apiKey)
      .where("enabled", "==", true)
      .get();

    if (snapshot.empty) {
      console.warn("API key not found or not enabled:", apiKey);
      return { isValid: false };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log("API key data found:", {
      fingerprintId: data.fingerprintId,
      enabled: data.enabled,
      createdAt: data.createdAt?.toDate?.(),
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

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

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
    const apiKey = generateApiKey();

    // Save API key
    const apiKeyRef = db.collection(COLLECTIONS.API_KEYS).doc();
    await apiKeyRef.set({
      key: apiKey,
      fingerprintId,
      createdAt: new Date(),
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

    return res.status(200).json({
      success: true,
      data: {
        key: apiKey,
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
};

// HTTP endpoint for validation
export const validate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { key } = req.body;

    if (!key) {
      console.warn("API key validation failed: Missing key in request body");
      return res.status(400).json({
        success: false,
        error: "Missing required field: key",
      });
    }

    const result = await validateApiKey(key);

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
};

export const revoke = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: key",
      });
    }

    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where("key", "==", key)
      .where("enabled", "==", true)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    // Check if the API key belongs to the authenticated user
    const apiKeyData = snapshot.docs[0].data();
    if (apiKeyData.fingerprintId !== req.fingerprintId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to revoke this API key",
      });
    }

    // Disable the API key instead of deleting it
    await snapshot.docs[0].ref.update({
      enabled: false,
      revokedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data: {
        message: "API key revoked successfully",
      },
    });
  } catch (error: any) {
    console.error("Error in revoke API key:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to revoke API key",
    });
  }
};
