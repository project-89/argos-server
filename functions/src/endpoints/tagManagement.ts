import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

export const addOrUpdateTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, tags } = req.body;

    if (!fingerprintId || !tags) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, tags" });
      return;
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const doc = await fingerprintRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Fingerprint not found" });
      return;
    }

    const currentTags = doc.data()?.tags || {};
    const updatedTags = {
      ...currentTags,
      ...tags,
    };

    await fingerprintRef.update({
      tags: updatedTags,
    });

    res.status(200).json({
      success: true,
      tags: updatedTags,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRolesBasedOnTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, tagRules } = req.body;

    if (!fingerprintId || !tagRules) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, tagRules" });
      return;
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const doc = await fingerprintRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Fingerprint not found" });
      return;
    }

    const data = doc.data();
    const currentTags = data?.tags || {};
    const currentRoles = new Set(data?.roles || []);

    // Apply tag rules
    Object.entries(tagRules).forEach(([tag, role]) => {
      if (currentTags[tag]) {
        currentRoles.add(role);
      }
    });

    const updatedRoles = Array.from(currentRoles);
    await fingerprintRef.update({
      roles: updatedRoles,
    });

    res.status(200).json({
      success: true,
      roles: updatedRoles,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
