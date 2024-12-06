import { Request, Response } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprint, metadata = {} } = req.body;

    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprint",
      });
    }

    const db = getFirestore();
    const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add({
      fingerprint,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
      roles: ["user"], // Default role
      tags: {},
    });

    const doc = await fingerprintRef.get();
    const data = doc.data();

    return res.json({
      success: true,
      data: {
        id: doc.id,
        fingerprint: data?.fingerprint,
        metadata: data?.metadata,
        roles: data?.roles,
        createdAt: data?.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error in register fingerprint:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to register fingerprint",
    });
  }
};

export const get = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: id",
      });
    }

    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const data = doc.data();

    return res.json({
      success: true,
      data: {
        id: doc.id,
        fingerprint: data?.fingerprint,
        metadata: data?.metadata,
        roles: data?.roles,
        createdAt: data?.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error in get fingerprint:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get fingerprint",
    });
  }
};
