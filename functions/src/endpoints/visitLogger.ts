import { Request, Response } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants";

export const logVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, url, title, timestamp = Date.now() } = req.body;

    if (!fingerprintId || !url) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, url" });
      return;
    }

    const db = getFirestore();
    const visitRef = await db.collection(COLLECTIONS.VISITS).add({
      fingerprintId,
      url,
      title,
      timestamp,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      visitId: visitRef.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePresence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, status, currentSites = [] } = req.body;

    if (!fingerprintId || !status) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, status" });
      return;
    }

    if (!["online", "offline"].includes(status)) {
      res.status(400).json({ error: "Status must be either 'online' or 'offline'" });
      return;
    }

    const db = getFirestore();
    const presenceRef = db.collection(COLLECTIONS.PRESENCE).doc(fingerprintId);

    await presenceRef.set(
      {
        status,
        currentSites,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    res.status(200).json({
      success: true,
      status,
      currentSites,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const removeSite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprintId, siteId } = req.body;

    if (!fingerprintId || !siteId) {
      res.status(400).json({ error: "Missing required fields: fingerprintId, siteId" });
      return;
    }

    const db = getFirestore();
    const presenceRef = db.collection(COLLECTIONS.PRESENCE).doc(fingerprintId);
    const doc = await presenceRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Presence record not found" });
      return;
    }

    const data = doc.data();
    const currentSites = data?.currentSites || [];
    const updatedSites = currentSites.filter((site: string) => site !== siteId);

    await presenceRef.update({
      currentSites: updatedSites,
      lastUpdated: FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      currentSites: updatedSites,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
