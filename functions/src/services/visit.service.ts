import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ApiError } from "../utils/error";
import { updatePresence } from "./presence.service";
import { ERROR_MESSAGES, COLLECTIONS } from "../constants";
import { toUnixMillis } from "../utils/timestamp";
import { extractDomain } from "../utils/request";
import {
  SiteResponse,
  VisitPresence,
  VisitResponse,
  VisitHistoryResponse,
  Visit,
  Site,
} from "../types";

/**
 * Verifies fingerprint exists and ownership
 */
export const verifyFingerprint = async ({
  fingerprintId,
  authenticatedId,
}: {
  fingerprintId: string;
  authenticatedId?: string;
}): Promise<void> => {
  try {
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
    const fingerprintDoc = await fingerprintRef.get();

    if (!fingerprintDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    if (authenticatedId && fingerprintId !== authenticatedId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }
  } catch (error) {
    console.error(`[Visit Service] Error in verifyFingerprint:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Logs a visit and updates site information
 */
export const logVisit = async ({
  fingerprintId,
  url,
  title,
  clientIp,
}: {
  fingerprintId: string;
  url: string;
  title?: string;
  clientIp?: string;
}): Promise<{ id: string; visit: VisitResponse; site: SiteResponse }> => {
  try {
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
    let site: SiteResponse;

    if (sitesSnapshot.empty) {
      // Create new site
      const newSite: Omit<Site, "id"> = {
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
        lastVisited: toUnixMillis(now),
        createdAt: toUnixMillis(now),
      };
    } else {
      // Update existing site
      const siteDoc = sitesSnapshot.docs[0];
      siteId = siteDoc.id;
      const siteData = siteDoc.data() as Site;
      site = {
        ...siteData,
        id: siteId,
        lastVisited: now.toMillis(),
        createdAt: siteData.createdAt.toMillis(),
        visits: (siteData.visits || 0) + 1,
      };

      await siteDoc.ref.update({
        lastVisited: now,
        visits: site.visits,
        title: title || domain,
      });
    }

    // Log the visit
    const visitData: Omit<Visit, "id"> = {
      fingerprintId,
      url,
      title: title || undefined,
      siteId,
      createdAt: now,
      ...(clientIp && { clientIp }),
    };

    // Filter out undefined values
    const sanitizedVisitData = Object.fromEntries(
      Object.entries(visitData).filter(([_, value]) => value !== undefined),
    );

    const visitRef = await db.collection(COLLECTIONS.VISITS).add(sanitizedVisitData);

    return {
      id: visitRef.id,
      visit: {
        fingerprintId,
        url,
        title: title || undefined,
        siteId,
        createdAt: toUnixMillis(now),
        ...(clientIp && { clientIp }),
      },
      site,
    };
  } catch (error) {
    console.error(`[Visit Service] Error in logVisit:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Updates presence status for a fingerprint
 */
export const updatePresenceStatus = async ({
  fingerprintId,
  status,
}: {
  fingerprintId: string;
  status: VisitPresence["status"];
}): Promise<{ fingerprintId: string; status: string; lastUpdated: number }> => {
  try {
    const result = await updatePresence({ fingerprintId, status });
    return result;
  } catch (error) {
    console.error(`[Visit Service] Error in updatePresenceStatus:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Removes a site and all its visits
 */
export const removeSiteAndVisits = async ({
  fingerprintId,
  siteId,
}: {
  fingerprintId: string;
  siteId: string;
}): Promise<{ fingerprintId: string; siteId: string }> => {
  try {
    const db = getFirestore();

    const siteRef = db.collection(COLLECTIONS.SITES).doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.SITE_NOT_FOUND);
    }

    const siteData = siteDoc.data() as Site;
    if (siteData.fingerprintId !== fingerprintId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.PERMISSION_REQUIRED);
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
    };
  } catch (error) {
    console.error(`[Visit Service] Error in removeSiteAndVisits:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Gets visit history for a fingerprint
 */
export const getVisitHistory = async ({
  fingerprintId,
}: {
  fingerprintId: string;
}): Promise<VisitHistoryResponse[]> => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("fingerprintId", "==", fingerprintId)
      .orderBy("createdAt", "desc")
      .get();

    // Get site information for each visit
    const visits = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const visitData = doc.data() as Visit;
        const siteDoc = await db.collection(COLLECTIONS.SITES).doc(visitData.siteId).get();
        const response: VisitHistoryResponse = {
          id: doc.id,
          fingerprintId: visitData.fingerprintId,
          url: visitData.url,
          title: visitData.title,
          siteId: visitData.siteId,
          createdAt: toUnixMillis(visitData.createdAt),
        };
        if (siteDoc.exists) {
          const siteData = siteDoc.data() as Site;
          response.site = {
            ...siteData,
            lastVisited: toUnixMillis(siteData.lastVisited),
            createdAt: toUnixMillis(siteData.createdAt),
          };
        }
        return response;
      }),
    );

    return visits;
  } catch (error: any) {
    console.error(`[Visit Service] Error in getVisitHistory:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
