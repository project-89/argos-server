import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { generateApiKey } from "../utils/apiKey";

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
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).get();

    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    // Generate new API key
    const apiKey = generateApiKey();

    // Save API key
    await db.collection(COLLECTIONS.API_KEYS).add({
      key: apiKey,
      fingerprintId,
      createdAt: new Date(),
    });

    return res.json({
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

export const validate = async (
  apiKey: string,
): Promise<{ isValid: boolean; fingerprintId?: string }> => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

    if (snapshot.empty) {
      return { isValid: false };
    }

    const doc = snapshot.docs[0];
    return {
      isValid: true,
      fingerprintId: doc.data().fingerprintId,
    };
  } catch (error) {
    console.error("Error validating API key:", error);
    return { isValid: false };
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
    const snapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", key).get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    // Delete the API key
    await snapshot.docs[0].ref.delete();

    return res.json({
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

export const validateEndpoint = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: key",
      });
    }

    const result = await validate(key);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in validate API key:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to validate API key",
    });
  }
};
