import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { Fingerprint } from "@/types";
import { COLLECTIONS, PREDEFINED_ROLES } from "@/constants";

export const assignRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, role } = req.body;

    if (!fingerprintId || !role) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, role" });
      return;
    }

    if (!PREDEFINED_ROLES.includes(role)) {
      res
        .status(400)
        .json({ error: `Invalid role. Must be one of: ${PREDEFINED_ROLES.join(", ")}` });
      return;
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const doc = await fingerprintRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Fingerprint not found" });
      return;
    }

    const data = doc.data() as Fingerprint;
    const currentRoles = data.roles || [];

    if (currentRoles.includes(role)) {
      res.status(200).json({ success: true, roles: currentRoles });
      return;
    }

    const updatedRoles = Array.from(new Set([...currentRoles, role]));
    await fingerprintRef.update({ roles: updatedRoles });
    res.status(200).json({ success: true, roles: updatedRoles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAvailableRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, roles: PREDEFINED_ROLES });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const removeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, role } = req.body;

    if (!fingerprintId || !role) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, role" });
      return;
    }

    if (!PREDEFINED_ROLES.includes(role)) {
      res
        .status(400)
        .json({ error: `Invalid role. Must be one of: ${PREDEFINED_ROLES.join(", ")}` });
      return;
    }

    if (role === "user") {
      res.status(400).json({ error: "Cannot remove the 'user' role" });
      return;
    }

    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const doc = await fingerprintRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Fingerprint not found" });
      return;
    }

    const data = doc.data() as Fingerprint;
    const currentRoles = data.roles || [];

    if (currentRoles.length === 1) {
      res.status(400).json({ error: "Cannot remove the last role" });
      return;
    }

    if (!currentRoles.includes(role)) {
      res.status(200).json({ success: true, roles: currentRoles });
      return;
    }

    const updatedRoles = currentRoles.filter((r) => r !== role);
    await fingerprintRef.update({ roles: updatedRoles });
    res.status(200).json({ success: true, roles: updatedRoles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
