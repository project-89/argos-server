import "./register";

import * as functions from "firebase-functions";
import express, { Request, Response } from "express";
import cors from "cors";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";
import { ScheduleOptions, onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

import { validateApiKeyMiddleware } from "./middleware/auth";
import { calculateRealityStabilityIndex } from "./endpoints/realityStabilityIndex";
import { logVisit, updatePresence, removeSite } from "./endpoints/visitLogger";
import { assignRole, getAvailableRoles, removeRole } from "./endpoints/roleManagement";
import { addOrUpdateTags, updateRolesBasedOnTags } from "./endpoints/tagManagement";
import { getTokenPrice, fetchCryptoPrices } from "./services/priceService";
import { createApiKey } from "./services/apiKeyService";
import { COLLECTIONS, FIREBASE_CONFIG, CACHE_CONFIG } from "./constants";
import {
  TimeFrame,
  Interval,
  ApiKeyResponse,
  PriceResponse,
  SuccessResponse,
  ErrorResponse,
  Fingerprint,
  PriceData,
  RegisterApiKeyRequest,
  RegisterFingerprintRequest,
  LogVisitRequest,
  UpdatePresenceRequest,
  RemoveSiteRequest,
  UpdateTagsRequest,
  UpdateRolesByTagsRequest,
  RoleResponse,
} from "./types";

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(validateApiKeyMiddleware);

// Price endpoints
app.get(
  "/price/:tokenId",
  async (req: Request, res: Response<{ success: true; prices: PriceData[] } | ErrorResponse>) => {
    try {
      const { tokenId } = req.params;
      const timeframe = (req.query.timeframe as TimeFrame) || "24h";
      const interval = (req.query.interval as Interval) || "15m";
      const prices = await getTokenPrice(tokenId, timeframe, interval);
      return res.json({ success: true, prices });
    } catch (error) {
      console.error(
        "Error fetching token price:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

app.get(
  "/prices",
  async (req: Request, res: Response<{ success: true; prices: PriceResponse } | ErrorResponse>) => {
    try {
      const symbols = req.query.symbols ? String(req.query.symbols).split(",") : undefined;
      const prices = await fetchCryptoPrices(symbols);
      return res.json({ success: true, prices });
    } catch (error) {
      console.error(
        "Error fetching prices:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

// Reality Stability endpoint
app.get("/reality-stability", calculateRealityStabilityIndex);

// API Key registration endpoint
app.post(
  "/register-api-key",
  async (
    req: Request<{}, {}, RegisterApiKeyRequest>,
    res: Response<ApiKeyResponse | ErrorResponse>,
  ) => {
    try {
      const { name, fingerprintId, metadata = {}, agentType } = req.body;

      if (!name || !fingerprintId) {
        return res.status(400).json({ error: "Missing required fields: name, fingerprintId" });
      }

      const cleanMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      const finalMetadata = {
        ...cleanMetadata,
        ...(agentType && { agentType }),
        isAIAgent: !!agentType,
      };

      const apiKey = await createApiKey({
        name,
        fingerprintId,
        metadata: finalMetadata,
      });

      return res.json({
        success: true,
        apiKey,
        fingerprintId,
        message: "Store this API key safely - it won't be shown again",
      });
    } catch (error) {
      console.error(
        "Error registering API key:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

// Fingerprint endpoints
app.post(
  "/register-fingerprint",
  async (
    req: Request<{}, {}, RegisterFingerprintRequest>,
    res: Response<SuccessResponse | ErrorResponse>,
  ) => {
    try {
      const { fingerprint, metadata = {} } = req.body;

      if (!fingerprint) {
        return res.status(400).json({ error: "Missing required field: fingerprint" });
      }

      const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        fingerprint,
        metadata,
        roles: ["user"],
        tags: {},
      });

      return res.json({
        success: true,
        message: `Fingerprint registered with ID: ${fingerprintRef.id}`,
      });
    } catch (error) {
      console.error(
        "Error registering fingerprint:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

app.get(
  "/get-fingerprint/:id",
  async (
    req: Request,
    res: Response<{ success: true; fingerprint: Fingerprint & { id: string } } | ErrorResponse>,
  ) => {
    try {
      const doc = await db.collection(COLLECTIONS.FINGERPRINTS).doc(req.params.id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Fingerprint not found" });
      }

      const data = doc.data() as Fingerprint;
      return res.json({
        success: true,
        fingerprint: {
          ...data,
          id: doc.id,
        },
      });
    } catch (error) {
      console.error(
        "Error fetching fingerprint:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

// Visit tracking endpoints
app.post(
  "/log-visit",
  async (req: Request<{}, {}, LogVisitRequest>, res: Response<SuccessResponse | ErrorResponse>) => {
    try {
      if (!req.body.fingerprintId || !req.body.url) {
        return res.status(400).json({ error: "Missing required fields: fingerprintId, url" });
      }
      await logVisit(req.body);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error logging visit:", error instanceof Error ? error.message : String(error));
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

app.post(
  "/update-presence",
  async (
    req: Request<{}, {}, UpdatePresenceRequest>,
    res: Response<SuccessResponse | ErrorResponse>,
  ) => {
    try {
      if (!req.body.fingerprintId || !req.body.status) {
        return res.status(400).json({ error: "Missing required fields: fingerprintId, status" });
      }
      await updatePresence(req.body);
      return res.json({ success: true });
    } catch (error) {
      console.error(
        "Error updating presence:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

app.post(
  "/remove-site",
  async (
    req: Request<{}, {}, RemoveSiteRequest>,
    res: Response<SuccessResponse | ErrorResponse>,
  ) => {
    try {
      if (!req.body.fingerprintId || !req.body.siteId) {
        return res.status(400).json({ error: "Missing required fields: fingerprintId, siteId" });
      }
      await removeSite(req.body);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error removing site:", error instanceof Error ? error.message : String(error));
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

// Role and tag management endpoints
app.post("/assign-role", async (req: Request, res: Response) => {
  try {
    if (!req.body.fingerprintId || !req.body.role) {
      return res.status(400).json({ error: "Missing required fields: fingerprintId, role" });
    }
    const roles = await assignRole(req.body);
    return res.json({ success: true, roles });
  } catch (error) {
    console.error("Error assigning role:", error instanceof Error ? error.message : String(error));
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/available-roles", async (_req: Request, res: Response) => {
  try {
    const roles = await getAvailableRoles();
    return res.json({ success: true, roles });
  } catch (error) {
    console.error(
      "Error getting available roles:",
      error instanceof Error ? error.message : String(error),
    );
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/remove-role", async (req: Request, res: Response) => {
  try {
    if (!req.body.fingerprintId || !req.body.role) {
      return res.status(400).json({ error: "Missing required fields: fingerprintId, role" });
    }
    const roles = await removeRole(req.body);
    return res.json({ success: true, roles });
  } catch (error) {
    console.error("Error removing role:", error instanceof Error ? error.message : String(error));
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post(
  "/update-tags",
  async (
    req: Request<{}, {}, UpdateTagsRequest>,
    res: Response<SuccessResponse | ErrorResponse>,
  ) => {
    try {
      if (!req.body.fingerprintId || !req.body.tags) {
        return res.status(400).json({ error: "Missing required fields: fingerprintId, tags" });
      }
      await addOrUpdateTags(req.body);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating tags:", error instanceof Error ? error.message : String(error));
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

app.post(
  "/update-roles-by-tags",
  async (
    req: Request<{}, {}, UpdateRolesByTagsRequest>,
    res: Response<RoleResponse | ErrorResponse>,
  ) => {
    try {
      if (!req.body.fingerprintId || !req.body.tagRules) {
        return res.status(400).json({ error: "Missing required fields: fingerprintId, tagRules" });
      }
      const roles = await updateRolesBasedOnTags(req.body);
      return res.json({ success: true, roles });
    } catch (error) {
      console.error(
        "Error updating roles by tags:",
        error instanceof Error ? error.message : String(error),
      );
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
);

// Scheduled cleanup function
const cleanupScheduleOptions: ScheduleOptions = {
  schedule: "every 24 hours",
  timeoutSeconds: 540,
  memory: FIREBASE_CONFIG.MEMORY,
  region: FIREBASE_CONFIG.REGION,
  maxInstances: FIREBASE_CONFIG.MAX_INSTANCES,
  minInstances: FIREBASE_CONFIG.MIN_INSTANCES,
};

export const cleanupCache = onSchedule(cleanupScheduleOptions, async (event: ScheduledEvent) => {
  try {
    console.log(`Starting cleanup at ${event.scheduleTime}`);
    const now = Date.now();
    const batch = db.batch();
    let cleanupCount = 0;

    // Cleanup old price cache
    const oldCache = await db
      .collection(COLLECTIONS.PRICE_CACHE)
      .where("timestamp", "<", now - CACHE_CONFIG.MAX_AGE)
      .get();

    oldCache.docs.forEach((doc) => {
      batch.delete(doc.ref);
      cleanupCount++;
    });

    // Cleanup old rate limit data
    const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc("coingecko");
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const oneHourAgo = now - 3600000;
      const requests = rateLimitDoc.data()?.requests || [];
      const newRequests = requests.filter((timestamp: number) => timestamp > oneHourAgo);

      if (newRequests.length !== requests.length) {
        batch.delete(rateLimitRef);
        cleanupCount += requests.length - newRequests.length;
      }
    }

    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`Cleaned up ${cleanupCount} old documents at ${new Date().toISOString()}`);
    }

    return;
  } catch (error) {
    console.error("Error during cleanup:", error instanceof Error ? error.message : String(error));
    throw error;
  }
});

// Export the express app as a single API function
export const api = functions.https.onRequest(app);
