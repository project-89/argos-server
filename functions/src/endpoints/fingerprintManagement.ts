import { Request, Response } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import { Fingerprint } from "../types";

export interface RegisterFingerprintParams {
  fingerprint: string;
  metadata?: Record<string, any>;
}

export const registerFingerprint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprint, metadata = {} } = req.body;

    if (!fingerprint) {
      res.status(400).json({ error: "Missing required field: fingerprint" });
      return;
    }

    const db = getFirestore();
    const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add({
      fingerprint,
      metadata,
      roles: ["user"],
      tags: {},
      createdAt: FieldValue.serverTimestamp(),
    });

    const doc = await fingerprintRef.get();
    const data = doc.data() as Fingerprint;

    res.status(200).json({
      success: true,
      fingerprint: {
        ...data,
        id: doc.id,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFingerprint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Missing required parameter: id" });
      return;
    }

    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ error: "Fingerprint not found" });
      return;
    }

    const data = doc.data() as Fingerprint;
    res.status(200).json({
      success: true,
      fingerprint: {
        ...data,
        id: doc.id,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
