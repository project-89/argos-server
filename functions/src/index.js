const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { calculateRealityStabilityIndex } = require("./endpoints/realityStabilityIndex");
const { getTokenPrice, fetchCryptoPrices } = require("./services/priceService");
const { validateApiKey } = require("./middleware/auth");
const { createApiKey } = require("./services/apiKeyService");
const { logVisit, updatePresence, removeSite } = require("./endpoints/visitLogger");
const { updateRolesBasedOnTags } = require("./endpoints/tagManagement");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

// Constants
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(validateApiKey);

// Public price endpoints (requires API key)
app.get("/price/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { timeframe = "24h", interval = "15m" } = req.query;
    const prices = await getTokenPrice(tokenId, timeframe, interval);
    res.json({ success: true, prices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/prices", async (req, res) => {
  try {
    const { symbols } = req.query;
    const tokenList = symbols ? symbols.split(",") : undefined;
    const prices = await fetchCryptoPrices(tokenList);
    res.json({ success: true, prices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reality Stability endpoint (remains public)
app.get("/reality-stability", calculateRealityStabilityIndex);

// API Key registration endpoint
app.post("/register-api-key", async (req, res) => {
  try {
    const { name, fingerprintId, metadata = {}, agentType } = req.body;

    // Clean metadata by removing undefined values
    const cleanMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    // Add agentType to metadata only if it exists
    const finalMetadata = {
      ...cleanMetadata,
      ...(agentType && { agentType }),
      isAIAgent: !!agentType,
    };

    const apiKey = await createApiKey(name, fingerprintId, finalMetadata);

    res.json({
      success: true,
      apiKey,
      fingerprintId,
      message: "Store this API key safely - it won't be shown again",
    });
  } catch (error) {
    console.error("Error registering API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Public fingerprint endpoints
app.post("/register-fingerprint", async (req, res) => {
  try {
    const { fingerprint, metadata = {} } = req.body;

    const fingerprintRef = await db.collection("fingerprints").add({
      createdAt: FieldValue.serverTimestamp(),
      fingerprint,
      metadata,
      roles: ["user"],
      tags: {},
    });

    res.json({
      success: true,
      fingerprintId: fingerprintRef.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/get-fingerprint/:id", async (req, res) => {
  try {
    const doc = await admin.firestore().collection("fingerprints").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Fingerprint not found" });
    }

    res.json({
      success: true,
      fingerprint: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public presence tracking endpoints
app.post("/log-visit", async (req, res) => {
  try {
    await logVisit(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/update-presence", async (req, res) => {
  try {
    await updatePresence(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/remove-site", async (req, res) => {
  try {
    await removeSite(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update the debug cleanup endpoint
app.post("/debug/cleanup", async (req, res) => {
  try {
    const now = Date.now();
    const batch = db.batch();
    let cleanupCount = 0;
    let rateLimitRequestsCleanup = 0;

    // Cleanup old price cache
    const oldCache = await db
      .collection("priceCache")
      .where("timestamp", "<", now - MAX_CACHE_AGE)
      .get();

    oldCache.docs.forEach((doc) => {
      batch.delete(doc.ref);
      cleanupCount++;
    });

    // Cleanup old rate limit data (older than 1 hour)
    const rateLimitRef = db.collection("rateLimits").doc("coingecko");
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const oneHourAgo = now - 3600000; // 1 hour in milliseconds
      const currentRequests = rateLimitDoc.data().requests || [];
      const updatedRequests = currentRequests.filter((timestamp) => timestamp > oneHourAgo);

      if (updatedRequests.length !== currentRequests.length) {
        batch.set(rateLimitRef, { requests: updatedRequests });
        rateLimitRequestsCleanup = currentRequests.length - updatedRequests.length;
        cleanupCount += rateLimitRequestsCleanup;
      }
    }

    // Cleanup old rate limit stats (older than 30 days)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oldStats = await db
      .collection("rateLimitStats")
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

    oldStats.docs.forEach((doc) => {
      batch.delete(doc.ref);
      cleanupCount++;
    });

    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`Cleaned up ${cleanupCount} old documents`);
    }

    res.json({
      success: true,
      cleanupCount,
      details: {
        priceCache: oldCache.size,
        rateLimitStats: oldStats.size,
        rateLimitRequests: rateLimitRequestsCleanup,
      },
    });
  } catch (error) {
    console.error("Error in cleanup:", error);
    res.status(500).json({ error: error.message });
  }
});

// Export the express app as a single API function
exports.api = functions.https.onRequest(app);

// Update the scheduled cleanup function
exports.cleanupCache = onSchedule(
  {
    schedule: "every 24 hours",
    timeoutSeconds: 540,
    memory: "2GB",
  },
  async (event) => {
    console.log(`Starting cleanup at ${event.timestamp}`);

    const now = Date.now();
    const batch = db.batch();
    let cleanupCount = 0;

    // Cleanup old price cache
    const oldCache = await db
      .collection("priceCache")
      .where("timestamp", "<", now - MAX_CACHE_AGE)
      .get();

    oldCache.docs.forEach((doc) => {
      batch.delete(doc.ref);
      cleanupCount++;
    });

    // Cleanup old rate limit data
    const rateLimitRef = db.collection("rateLimits").doc("coingecko");
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const oneHourAgo = now - 3600000;
      const requests = rateLimitDoc.data().requests || [];
      const newRequests = requests.filter((timestamp) => timestamp > oneHourAgo);

      if (newRequests.length !== requests.length) {
        batch.set(rateLimitRef, { requests: newRequests });
        cleanupCount += requests.length - newRequests.length;
      }
    }

    // Cleanup old rate limit stats
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oldStats = await db
      .collection("rateLimitStats")
      .where("timestamp", "<", thirtyDaysAgo)
      .get();

    oldStats.docs.forEach((doc) => {
      batch.delete(doc.ref);
      cleanupCount++;
    });

    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`Cleaned up ${cleanupCount} old documents`);
    }

    return null;
  },
);

// Export the auto role update trigger
exports.autoUpdateRolesOnTagChange = onDocumentUpdated(
  "fingerprints/{fingerprintId}",
  async (event) => {
    const beforeData = event.before && event.before.data();
    const afterData = event.after && event.after.data();

    if (!beforeData || !afterData) {
      console.log("Missing data in event:", { beforeData, afterData });
      return null;
    }

    if (JSON.stringify(beforeData.tags) === JSON.stringify(afterData.tags)) {
      console.log("Tags have not changed, skipping update");
      return null;
    }

    const fingerprintId = event.params.fingerprintId;
    console.log(`Processing tags for fingerprint ${fingerprintId}:`, afterData.tags);

    await updateRolesBasedOnTags({ fingerprintId });

    console.log("Successfully processed tag change");
    return null;
  },
);
