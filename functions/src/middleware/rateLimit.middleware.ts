import { Request, Response, NextFunction } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each IP/API key to 100 requests per windowMs
};

export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs, max } = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip rate limiting in test mode or when x-test-env header is present
      if (process.env.NODE_ENV === "test" || req.headers["x-test-env"] === "true") {
        next();
        return;
      }

      const db = getFirestore();
      const apiKey = req.headers["x-api-key"];
      const identifier = apiKey ? String(apiKey) : req.ip || "unknown";
      const now = Date.now();

      // Get rate limit document
      const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(identifier);
      const doc = await rateLimitRef.get();

      if (!doc.exists) {
        // First request, create new document
        await rateLimitRef.set({
          requests: [now],
          createdAt: FieldValue.serverTimestamp(),
          identifier,
          type: apiKey ? "api_key" : "ip",
        });
        next();
        return;
      }

      const data = doc.data();
      if (!data) {
        throw new Error("Rate limit data is missing");
      }

      // Filter requests within the current window
      const requests = (data.requests as number[]) || [];
      const windowStart = now - windowMs;
      const recentRequests = requests.filter((time) => time > windowStart);

      if (recentRequests.length >= max) {
        res.status(429).json({
          success: false,
          error: "Too many requests, please try again later",
          retryAfter: Math.ceil((Math.min(...recentRequests) + windowMs - now) / 1000),
        });
        return;
      }

      // Add current request and update document
      recentRequests.push(now);
      await rateLimitRef.update({
        requests: recentRequests,
        lastUpdated: FieldValue.serverTimestamp(),
      });

      // Log rate limit stats
      await db.collection(COLLECTIONS.RATE_LIMIT_STATS).add({
        identifier,
        timestamp: now,
        endpoint: req.path,
        method: req.method,
        remaining: max - recentRequests.length,
        type: apiKey ? "api_key" : "ip",
      });

      next();
    } catch (error: any) {
      console.error("Error in rate limiting:", error);
      // On error, allow request to proceed but log the error
      next();
    }
  };
};
