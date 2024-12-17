import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, ROLES } from "../constants";

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprint, metadata } = req.body;

    // Validate required fields
    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprint",
      });
    }

    // Create fingerprint document
    const db = getFirestore();
    const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add({
      fingerprint,
      roles: [ROLES.USER], // Default role
      createdAt: new Date(),
      metadata: metadata || {},
      tags: {},
    });

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        id: fingerprintRef.id,
        fingerprint,
        roles: [ROLES.USER],
        createdAt: new Date(),
        metadata: metadata || {},
        tags: {},
      },
    });
  } catch (error) {
    console.error("Error registering fingerprint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const get = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const fingerprintId = req.fingerprintId;

    // Verify ownership
    if (id !== fingerprintId) {
      return res.status(403).json({
        success: false,
        error: "API key does not match fingerprint",
      });
    }

    // Get fingerprint document
    const db = getFirestore();
    const fingerprintDoc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(id).get();

    // Check if fingerprint exists
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        id: fingerprintDoc.id,
        ...fingerprintDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error getting fingerprint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
