import { Request, Response, NextFunction } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";
import * as functions from "firebase-functions";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each fingerprint to 100 requests per windowMs
};

export const fingerprintRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs } = { ...DEFAULT_CONFIG, ...config };
  const functionConfig = functions.config();
  // Use config for max if set, otherwise use config or default
  const max = functionConfig.rate_limit?.fingerprint_max
    ? parseInt(functionConfig.rate_limit.fingerprint_max, 10)
    : config.max || DEFAULT_CONFIG.max;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if rate limiting is explicitly disabled
    if (
      functionConfig.rate_limit?.disabled === "true" ||
      functionConfig.rate_limit?.fingerprint_disabled === "true"
    ) {
      console.log("[Fingerprint Rate Limit] Rate limiting is disabled");
      next();
      return;
    }

    console.log(`[Fingerprint Rate Limit] Using max limit of ${max} requests per ${windowMs}ms`);

    try {
      const db = getFirestore();
      // Only use the validated fingerprintId from auth middleware
      const fingerprint = req.fingerprintId;

      if (!fingerprint) {
        // Skip rate limiting if no fingerprint is available (for public routes)
        console.log("[Fingerprint Rate Limit] No fingerprint available, skipping rate limit check");
        next();
        return;
      }

      console.log(
        `[Fingerprint Rate Limit] Processing request for fingerprint: ${fingerprint}, path: ${req.path}`,
      );

      const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`fingerprint:${fingerprint}`);

      // Use a transaction to ensure atomic updates
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const result = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(rateLimitRef);
            const now = Date.now();
            const windowStart = now - windowMs;

            if (!doc.exists) {
              console.log(
                `[Fingerprint Rate Limit] First request from fingerprint: ${fingerprint}`,
              );
              transaction.set(rateLimitRef, {
                requests: [now],
                createdAt: FieldValue.serverTimestamp(),
                type: "fingerprint",
                lastUpdated: FieldValue.serverTimestamp(),
              });
              return { limited: false, count: 1 };
            }

            const data = doc.data();
            if (!data) {
              throw new Error("Rate limit data is missing");
            }

            // Get requests within the current window
            const requests = (data.requests as number[]) || [];
            const recentRequests = requests.filter((time) => time > windowStart);

            console.log(
              `[Fingerprint Rate Limit] Fingerprint: ${fingerprint}, Recent requests: ${recentRequests.length}, Max: ${max}`,
            );

            // Check if we've hit the limit
            if (recentRequests.length >= max) {
              const oldestRequest = Math.min(...recentRequests);
              const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
              console.log(
                `[Fingerprint Rate Limit] Rate limit exceeded for fingerprint: ${fingerprint}, retry after: ${retryAfter}s`,
              );
              return { limited: true, retryAfter, count: recentRequests.length };
            }

            // Add current request and update, keeping only requests within the window
            const updatedRequests = [...recentRequests, now];
            transaction.update(rateLimitRef, {
              requests: updatedRequests,
              lastUpdated: FieldValue.serverTimestamp(),
            });

            console.log(
              `[Fingerprint Rate Limit] Updated request count for fingerprint: ${fingerprint}, new count: ${updatedRequests.length}`,
            );
            return { limited: false, count: updatedRequests.length };
          });

          if (result.limited) {
            res.status(429).json({
              success: false,
              error: "Too many requests, please try again later",
              retryAfter: result.retryAfter,
            });
            return;
          }

          next();
          return;
        } catch (error) {
          console.error(
            `[Fingerprint Rate Limit] Transaction failed (attempt ${retries + 1}):`,
            error,
          );
          retries++;
          if (retries === maxRetries) {
            throw error;
          }
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, retries)));
        }
      }
    } catch (error) {
      console.error("[Fingerprint Rate Limit] Error:", error);
      res.status(500).json({
        success: false,
        error: "Rate limit check failed",
      });
    }
  };
};
