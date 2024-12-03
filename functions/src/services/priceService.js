const axios = require("axios");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const BASE_URL = "https://api.coingecko.com/api/v3";
const API_KEY = process.env.COINGECKO_API_KEY;
const RATE_LIMIT = 30;

// Different cache durations based on timeframe
const CACHE_DURATIONS = {
  "1h": 60 * 1000, // 1 minute for hourly data
  "24h": 5 * 60 * 1000, // 5 minutes for daily data
  "7d": 15 * 60 * 1000, // 15 minutes for weekly data
};

// Maximum age for cache entries
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

async function getFromCache(cacheKey, timeframe) {
  const db = getFirestore();
  const doc = await db.collection("priceCache").doc(cacheKey).get();

  if (doc.exists) {
    const data = doc.data();
    const age = Date.now() - data.timestamp;
    const cacheDuration = CACHE_DURATIONS[timeframe] || CACHE_DURATIONS["24h"];

    if (age < cacheDuration) {
      // Convert back to array format
      return {
        prices: data.prices.map((p) => [p.timestamp, p.price]),
      };
    }
  }
  return null;
}

async function setCache(cacheKey, value, timeframe) {
  const db = getFirestore();
  // Store prices as an array of objects
  const cacheData = {
    prices: value.prices.map(([timestamp, price]) => ({
      timestamp,
      price,
    })),
    timestamp: Date.now(),
    timeframe,
  };

  await db.collection("priceCache").doc(cacheKey).set(cacheData);
}

async function logRateLimitHit() {
  const db = getFirestore();
  await db.collection("rateLimitStats").add({
    timestamp: FieldValue.serverTimestamp(),
    api: "coingecko",
  });
}

async function cleanupOldCache() {
  const db = getFirestore();
  const cutoff = Date.now() - MAX_CACHE_AGE;

  const oldCacheRef = db.collection("priceCache").where("timestamp", "<", cutoff);

  const snapshot = await oldCacheRef.get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (snapshot.size > 0) {
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} old cache entries`);
  }
}

// Track monthly API calls
async function trackMonthlyUsage() {
  const db = getFirestore();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyStats = await db
    .collection("rateLimitStats")
    .where("timestamp", ">=", monthStart)
    .get();

  if (monthlyStats.size >= 9900) {
    // Buffer of 100 calls
    throw new Error("Monthly API limit approaching, using cached data only");
  }
}

async function makeRateLimitedRequest(url, params, cacheKey, timeframe) {
  try {
    // Check monthly limit first
    await trackMonthlyUsage();

    // Try cache first
    const cachedData = await getFromCache(cacheKey, timeframe);
    if (cachedData) {
      return cachedData;
    }

    // Check rate limit
    const db = getFirestore();
    const rateLimitRef = db.collection("rateLimits").doc("coingecko");

    let canMakeRequest = false;
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const windowStart = now - 60000;

      let requests = [];
      if (doc.exists) {
        requests = doc.data().requests.filter((timestamp) => timestamp > windowStart);
      }

      if (requests.length >= RATE_LIMIT) {
        await logRateLimitHit();
        // Return most recent cached data if available
        const latestCache = await getFromCache(cacheKey, timeframe);
        if (latestCache) {
          return latestCache;
        }
        throw new Error("Rate limit exceeded and no cache available");
      }

      requests.push(now);
      transaction.set(rateLimitRef, { requests });
      canMakeRequest = true;
    });

    if (!canMakeRequest) {
      throw new Error("Rate limit check failed");
    }

    // Make request
    const response = await axios.get(url, { params });

    // Cache response
    await setCache(cacheKey, response.data, timeframe);

    // Cleanup old cache entries periodically (1% chance)
    if (Math.random() < 0.01) {
      await cleanupOldCache();
    }

    return response.data;
  } catch (error) {
    console.error("Rate limit error:", error.message);
    // Always try to return cached data if available
    const cachedData = await getFromCache(cacheKey, timeframe);
    if (cachedData) {
      return cachedData;
    }
    throw error;
  }
}

function createCoinGeckoParams(params) {
  /* eslint-disable camelcase */
  return {
    ...params,
    vs_currency: "usd",
    vs_currencies: "usd",
    include_market_cap: true,
    x_cg_demo_api_key: API_KEY,
  };
  /* eslint-enable camelcase */
}

/**
 * Fetches historical price data from CoinGecko
 */
exports.getTokenPrice = async (tokenId, timeframe, interval) => {
  try {
    const formattedTokenId = tokenId === "89" ? "project89" : tokenId;
    const url = `${BASE_URL}/coins/${formattedTokenId}/market_chart`;
    const days = timeframe === "24h" ? 1 : 7;

    /* eslint-disable camelcase */
    const params = {
      vs_currency: "usd",
      days,
      x_cg_demo_api_key: API_KEY,
    };
    /* eslint-enable camelcase */

    const cacheKey = `price_${formattedTokenId}_${timeframe}_${interval}`;
    const data = await makeRateLimitedRequest(url, params, cacheKey, timeframe);

    if (!data || !data.prices || data.prices.length === 0) {
      throw new Error("Invalid price data received");
    }

    // Post-process the data to match requested interval
    let prices = data.prices;
    const minutesInInterval = {
      "15m": 15,
      "1h": 60,
      "4h": 240,
      "1d": 1440,
    };

    const minutes = minutesInInterval[interval] || 15; // Default to 15m
    if (minutes > 0) {
      // Filter points based on time interval
      const msInterval = minutes * 60 * 1000;
      prices = prices.filter((price, index) => {
        if (index === 0) {
          return true;
        }
        const timeDiff = price[0] - prices[index - 1][0];
        return timeDiff >= msInterval;
      });
    }

    return prices.map(([timestamp, price]) => ({
      timestamp,
      price: Number(price),
    }));
  } catch (error) {
    console.error("Error fetching price data from CoinGecko:", error.message);
    if (error.response && error.response.data) {
      console.error("CoinGecko API response:", error.response.data);
    }
    throw new Error(`Failed to fetch price data: ${error.message}`);
  }
};

/**
 * Fetches current price data for multiple tokens
 */
exports.fetchCryptoPrices = async (cryptoSymbols = ["project89", "solana"]) => {
  try {
    const url = `${BASE_URL}/simple/price`;
    const params = createCoinGeckoParams({
      ids: cryptoSymbols.join(","),
    });

    const response = await axios.get(url, { params });

    if (!response.data) {
      throw new Error("Invalid response from CoinGecko");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching crypto prices from CoinGecko:", error.message);
    if (error.response && error.response.data) {
      console.error("CoinGecko API response:", error.response.data);
    }
    throw new Error(`Failed to fetch crypto prices: ${error.message}`);
  }
};
