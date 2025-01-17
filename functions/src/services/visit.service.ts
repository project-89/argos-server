import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";
import { ApiError } from "../utils/error";
import { updatePresence } from "./presence.service";
import { Visit, Site, VisitHistoryResponse, SiteModel, VisitPresence } from "../types/api.types";
import { ERROR_MESSAGES } from "../constants/api";

/**
 * Extracts domain from URL
 */
export const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
};

/**
 * Verifies fingerprint exists and ownership
 */
export const verifyFingerprint = async (
  fingerprintId: string,
  authenticatedId?: string,
): Promise<void> => {
  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
  const fingerprintDoc = await fingerprintRef.get();

  if (!fingerprintDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
  }

  if (authenticatedId && fingerprintId !== authenticatedId) {
    throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  }
};

/**
 * Logs a visit and updates site information
 */
export const logVisit = async (
  fingerprintId: string,
  url: string,
  title?: string,
  clientIp?: string,
): Promise<VisitHistoryResponse> => {
  const db = getFirestore();
  const domain = extractDomain(url);
  const now = Timestamp.now();

  // Find or create site
  const sitesSnapshot = await db
    .collection(COLLECTIONS.SITES)
    .where("domain", "==", domain)
    .where("fingerprintId", "==", fingerprintId)
    .limit(1)
    .get();

  let siteId: string;
  let site: SiteModel;

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
      createdAt: now,
    };

    const siteRef = await db.collection(COLLECTIONS.SITES).add(newSite);
    siteId = siteRef.id;
    site = {
      id: siteId,
      ...newSite,
      lastVisited: now.toMillis(),
      createdAt: now.toMillis(),
    };
  } else {
    // Update existing site
    const siteDoc = sitesSnapshot.docs[0];
    siteId = siteDoc.id;
    const siteData = siteDoc.data() as Site;
    site = {
      id: siteId,
      ...siteData,
      lastVisited: now.toMillis(),
      createdAt: siteData.createdAt.toMillis(),
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
    title: title || undefined,
    siteId,
    timestamp: now,
    ...(clientIp && { clientIp }),
  };

  // Remove any undefined values
  const sanitizedVisitData = Object.fromEntries(
    Object.entries(visitData).filter(([_, value]) => value !== undefined),
  ) as Visit;

  const visitRef = await db.collection(COLLECTIONS.VISITS).add(sanitizedVisitData);

  return {
    id: visitRef.id,
    ...sanitizedVisitData,
    timestamp: sanitizedVisitData.timestamp.toMillis(),
    site,
  };
};

/**
 * Updates presence status for a fingerprint
 */
export const updatePresenceStatus = async (
  fingerprintId: string,
  status: VisitPresence["status"],
): Promise<{ fingerprintId: string; status: string; lastUpdated: number }> => {
  const result = await updatePresence(fingerprintId, status);
  return result;
};

/**
 * Removes a site and all its visits
 */
export const removeSiteAndVisits = async (
  fingerprintId: string,
  siteId: string,
): Promise<{ fingerprintId: string; siteId: string; timestamp: number }> => {
  const db = getFirestore();

  const siteRef = db.collection(COLLECTIONS.SITES).doc(siteId);
  const siteDoc = await siteRef.get();

  if (!siteDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.SITE_NOT_FOUND);
  }

  const siteData = siteDoc.data() as Site;
  if (siteData.fingerprintId !== fingerprintId) {
    throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
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

  return {
    fingerprintId,
    siteId,
    timestamp: siteData.lastVisited.toMillis(),
  };
};

/**
 * Gets visit history for a fingerprint
 */
export const getVisitHistory = async (fingerprintId: string): Promise<VisitHistoryResponse[]> => {
  const db = getFirestore();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("fingerprintId", "==", fingerprintId)
      .orderBy("timestamp", "desc")
      .get();

    // Get site information for each visit
    const visits = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const visitData = doc.data() as Visit;
        const siteDoc = await db.collection(COLLECTIONS.SITES).doc(visitData.siteId).get();
        const response: VisitHistoryResponse = {
          ...visitData,
          id: doc.id,
          timestamp: visitData.timestamp.toMillis(),
        };
        if (siteDoc.exists) {
          const siteData = siteDoc.data() as Site;
          response.site = {
            id: siteDoc.id,
            ...siteData,
            lastVisited: siteData.lastVisited.toMillis(),
            createdAt: siteData.createdAt.toMillis(),
          };
        }
        return response;
      }),
    );

    return visits;
  } catch (error: any) {
    if (error.code === 9 && error.message.includes("requires an index")) {
      console.error("Index required for this query. Please create the following index:");
      console.error(`Collection: ${COLLECTIONS.VISITS}`);
      console.error("Fields: fingerprintId (ASC), timestamp (DESC)");
      throw new ApiError(500, "Database index not ready. Please try again in a few minutes.");
    }
    throw error;
  }
};
