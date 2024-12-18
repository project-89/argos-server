import { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

interface Visit {
  fingerprintId: string;
  timestamp: number;
  url: string;
  title: string | undefined;
  siteId: string;
}

interface Site {
  domain: string;
  fingerprintId: string;
  lastVisited: number;
  title?: string;
  visits: number;
  settings: {
    notifications: boolean;
    privacy: "public" | "private";
  };
}

interface VisitHistoryResponse {
  id: string;
  fingerprintId: string;
  timestamp: number;
  url: string;
  title?: string;
  siteId: string;
  site?: Site & { id: string };
}

const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
};

export const log = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, url, title } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: url",
      });
    }

    const db = getFirestore();

    // Verify fingerprint exists
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const domain = extractDomain(url);

    // Find or create site
    const sitesSnapshot = await db
      .collection(COLLECTIONS.SITES)
      .where("domain", "==", domain)
      .where("fingerprintId", "==", fingerprintId)
      .limit(1)
      .get();

    let siteId: string;
    let site: Site & { id: string };
    const now = Date.now();

    if (sitesSnapshot.empty) {
      // Create new site
      const newSite: Site = {
        domain,
        fingerprintId,
        lastVisited: now,
        title: title || domain,
        visits: 1,
        settings: {
          notifications: true,
          privacy: "private",
        },
      };

      const siteRef = await db.collection(COLLECTIONS.SITES).add(newSite);
      siteId = siteRef.id;
      site = { id: siteId, ...newSite };
    } else {
      // Update existing site
      const siteDoc = sitesSnapshot.docs[0];
      siteId = siteDoc.id;
      const siteData = siteDoc.data() as Site;
      site = {
        id: siteId,
        ...siteData,
        lastVisited: now,
        visits: (siteData.visits || 0) + 1,
        title: title || siteData.title,
      };

      await siteDoc.ref.update({
        lastVisited: now,
        visits: site.visits,
        title: site.title,
      });
    }

    // Log the visit
    const visitData: Visit = {
      fingerprintId,
      url,
      title: title || null,
      siteId,
      timestamp: now,
    };

    // Remove any undefined values
    const sanitizedVisitData = Object.fromEntries(
      Object.entries(visitData).filter(([_, value]) => value !== undefined),
    ) as Visit;

    const visitRef = await db.collection(COLLECTIONS.VISITS).add(sanitizedVisitData);

    return res.status(200).json({
      success: true,
      data: {
        id: visitRef.id,
        ...sanitizedVisitData,
        site,
      },
    });
  } catch (error: any) {
    console.error("Error in log visit:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to log visit",
    });
  }
};

export const updatePresence = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, status } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: status",
      });
    }

    const db = getFirestore();

    // Verify fingerprint exists
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const presenceRef = await db.collection(COLLECTIONS.PRESENCE).doc(fingerprintId);
    await presenceRef.set(
      {
        status,
        lastUpdated: Date.now(),
      },
      { merge: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        fingerprintId,
        status,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error("Error in update presence:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update presence",
    });
  }
};

export const removeSite = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId, siteId } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: siteId",
      });
    }

    const db = getFirestore();

    // Verify fingerprint exists
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const siteRef = db.collection(COLLECTIONS.SITES).doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Site not found",
      });
    }

    if (siteDoc.data()?.fingerprintId !== fingerprintId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to remove this site",
      });
    }

    // Delete all visits for this site
    const visitsSnapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("siteId", "==", siteId)
      .get();

    const batch = db.batch();
    visitsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    batch.delete(siteRef);
    await batch.commit();

    return res.status(200).json({
      success: true,
      data: {
        fingerprintId,
        siteId,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error("Error in remove site:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to remove site",
    });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprintId } = req.params;

    if (!fingerprintId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprintId",
      });
    }

    const db = getFirestore();

    // Verify fingerprint exists
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();
    if (!fingerprintDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Fingerprint not found",
      });
    }

    const snapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("fingerprintId", "==", fingerprintId)
      .orderBy("timestamp", "desc")
      .get();

    // Get site information for each visit
    const visits: VisitHistoryResponse[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const visitData = doc.data() as Visit;
        const siteDoc = await db.collection(COLLECTIONS.SITES).doc(visitData.siteId).get();
        const response: VisitHistoryResponse = {
          ...visitData,
          id: doc.id,
        };
        if (siteDoc.exists) {
          response.site = { id: siteDoc.id, ...(siteDoc.data() as Site) };
        }
        return response;
      }),
    );

    return res.status(200).json({
      success: true,
      data: visits,
    });
  } catch (error: any) {
    if (error.code === 9 && error.message.includes("requires an index")) {
      console.error("Index required for this query. Please create the following index:");
      console.error(`Collection: ${COLLECTIONS.VISITS}`);
      console.error("Fields: fingerprintId (ASC), timestamp (DESC)");
      return res.status(500).json({
        success: false,
        error: "Database index not ready. Please try again in a few minutes.",
      });
    }
    console.error("Error in get visit history:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get visit history",
    });
  }
};
