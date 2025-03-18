import { ApiError, extractDomain } from "../utils";
import { updatePresence } from ".";
import { ERROR_MESSAGES, COLLECTIONS } from "../constants";
import {
  SiteResponse,
  VisitPresence,
  VisitResponse,
  VisitHistoryResponse,
  Visit,
  Site,
} from "../schemas";

// Import MongoDB utilities
import { getDb } from "../utils/mongodb";
import { startMongoSession, withTransaction } from "../utils/mongo-session";
import { idFilter, stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Visit Service]";

/**
 * Logs a visit and updates site information
 */
export const logVisit = async ({
  fingerprintId,
  url,
  title,
  clientIp,
  metadata,
}: {
  fingerprintId: string;
  url: string;
  title?: string;
  clientIp?: string;
  metadata?: Record<string, any>;
}): Promise<{ id: string; visit: VisitResponse; site: SiteResponse }> => {
  try {
    const db = await getDb();
    const domain = extractDomain(url);
    const now = new Date();

    // Find or create site
    const site = await db.collection(COLLECTIONS.SITES).findOne({
      domain,
      fingerprintId,
    });

    let siteId: string;
    let siteResponse: SiteResponse;

    if (!site) {
      // Create new site
      const newSite = {
        domain,
        fingerprintId,
        lastVisited: now,
        title: title || domain,
        visits: 1,
        settings: {
          notifications: true,
          privacy: "private" as const,
        },
        createdAt: now,
        updatedAt: now,
      };

      const siteResult = await db.collection(COLLECTIONS.SITES).insertOne(newSite);
      siteId = siteResult.insertedId.toString();
      siteResponse = {
        id: siteId,
        ...newSite,
        lastVisited: now.getTime(),
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      };
    } else {
      // Update existing site
      siteId = site._id.toString();
      const updatedVisits = (site.visits || 0) + 1;

      await db.collection(COLLECTIONS.SITES).updateOne(idFilter(siteId), {
        $set: {
          lastVisited: now,
          visits: updatedVisits,
          title: title || domain,
          updatedAt: now,
        },
      });

      siteResponse = {
        ...site,
        id: siteId,
        lastVisited: now.getTime(),
        createdAt: site.createdAt instanceof Date ? site.createdAt.getTime() : site.createdAt,
        updatedAt: now.getTime(),
        visits: updatedVisits,
        title: title || domain,
      };
    }

    // Log the visit
    const visitData: Omit<Visit, "id"> = {
      fingerprintId,
      url,
      title: title || undefined,
      siteId,
      createdAt: now,
      ...(clientIp && { clientIp }),
      ...(metadata && { metadata }),
    };

    // Filter out undefined values
    const sanitizedVisitData = Object.fromEntries(
      Object.entries(visitData).filter(([_, value]) => value !== undefined),
    );

    const visitResult = await db.collection(COLLECTIONS.VISITS).insertOne(sanitizedVisitData);
    const visitId = visitResult.insertedId.toString();

    console.log(`${LOG_PREFIX} Visit logged: ${visitId} for ${fingerprintId} on ${domain}`);

    return {
      id: visitId,
      visit: {
        id: visitId,
        fingerprintId,
        url,
        title: title || undefined,
        siteId,
        createdAt: now.getTime(),
        ...(clientIp && { clientIp }),
        ...(metadata && { metadata }),
      },
      site: siteResponse,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in logVisit:`, error);
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
    console.error(`${LOG_PREFIX} Error in updatePresenceStatus:`, error);
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
    const db = await getDb();

    // Check if site exists and belongs to fingerprint
    const site = await db.collection(COLLECTIONS.SITES).findOne(idFilter(siteId));

    if (!site) {
      throw ApiError.from(null, 404, ERROR_MESSAGES.SITE_NOT_FOUND);
    }

    if (site.fingerprintId !== fingerprintId) {
      throw ApiError.from(null, 403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Use withTransaction pattern for atomic operations
    await withTransaction(async (session) => {
      // Delete all visits for this site
      await db
        .collection(COLLECTIONS.VISITS)
        .deleteMany(stringIdFilter("siteId", siteId), { session });

      // Delete the site using idFilter for proper ObjectId handling
      await db.collection(COLLECTIONS.SITES).deleteOne(idFilter(siteId), { session });
    });

    console.log(`${LOG_PREFIX} Removed site ${siteId} and its visits for ${fingerprintId}`);

    return {
      fingerprintId,
      siteId,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in removeSiteAndVisits:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Gets visit history for a fingerprint
 */
export const getVisitHistory = async ({
  fingerprintId,
  limit = 50,
  offset = 0,
}: {
  fingerprintId: string;
  limit?: number;
  offset?: number;
}): Promise<VisitHistoryResponse[]> => {
  try {
    const db = await getDb();

    // Get visits with pagination
    const visits = await db
      .collection(COLLECTIONS.VISITS)
      .find({ fingerprintId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    if (visits.length === 0) {
      return [];
    }

    // Get unique site IDs from visits
    const siteIds = [...new Set(visits.map((visit) => visit.siteId))];

    // Convert string IDs to ObjectIds for MongoDB query
    const objectIds = siteIds
      .map((id) => {
        if (typeof id === "string") {
          try {
            return idFilter(id);
          } catch (error) {
            console.warn(`${LOG_PREFIX} Invalid ObjectId: ${id}`);
            return null;
          }
        }
        return null;
      })
      .filter((id) => id !== null);

    // Fetch all sites in a single query
    const sites = await db
      .collection(COLLECTIONS.SITES)
      .find({ _id: { $in: objectIds } })
      .toArray();

    // Create a map of site ID to site data for quick lookup
    const siteMap = new Map();
    sites.forEach((site) => {
      const formattedSite = {
        ...site,
        id: site._id.toString(),
        lastVisited:
          site.lastVisited instanceof Date ? site.lastVisited.getTime() : site.lastVisited,
        createdAt: site.createdAt instanceof Date ? site.createdAt.getTime() : site.createdAt,
        updatedAt: site.updatedAt instanceof Date ? site.updatedAt.getTime() : undefined,
      };
      delete formattedSite._id;
      siteMap.set(formattedSite.id, formattedSite);
    });

    // Map visits to response format with site data
    const visitHistory = visits.map((visit) => {
      const formattedVisit: VisitHistoryResponse = {
        id: visit._id.toString(),
        fingerprintId: visit.fingerprintId,
        url: visit.url,
        title: visit.title,
        siteId: visit.siteId,
        createdAt: visit.createdAt instanceof Date ? visit.createdAt.getTime() : visit.createdAt,
        metadata: visit.metadata,
      };

      const site = siteMap.get(visit.siteId);
      if (site) {
        formattedVisit.site = site;
      }

      return formattedVisit;
    });

    console.log(
      `${LOG_PREFIX} Retrieved ${visits.length} visit history items for ${fingerprintId}`,
    );

    return visitHistory;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in getVisitHistory:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
