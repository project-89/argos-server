import { Request, Response, NextFunction } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, DEFAULT_FINGERPRINT_RATE_LIMIT_CONFIG } from "../constants";
import { RateLimitConfig } from "../schemas";

export const fingerprintRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs } = { ...DEFAULT_FINGERPRINT_RATE_LIMIT_CONFIG, ...config } as RateLimitConfig;
  // Use environment variables or fallback to config/default
  const isDisabled =
    process.env.RATE_LIMIT_DISABLED === "true" ||
    process.env.FINGERPRINT_RATE_LIMIT_DISABLED === "true";
  const max = process.env.FINGERPRINT_RATE_LIMIT_MAX
    ? parseInt(process.env.FINGERPRINT_RATE_LIMIT_MAX, 10)
    : config.max || DEFAULT_FINGERPRINT_RATE_LIMIT_CONFIG.max;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if rate limiting is explicitly disabled
    if (isDisabled) {
      console.log("[Fingerprint Rate Limit] Rate limiting is disabled");
      next();
      return;
    }

    console.log(`[Fingerprint Rate Limit] Using max limit of ${max} requests per ${windowMs}ms`);

    try {
      const db = getFirestore();
      // Only use the validated fingerprintId from auth middleware
      const fingerprint = req.auth?.fingerprint.id;
      const now = Timestamp.now();
      const nowUnix = now.toMillis();

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
            const data = doc.data();

            // Get recent requests within the window
            const recentRequests = data?.requests || [];
            const windowStart = nowUnix - windowMs;

            // Filter out old requests
            const validRequests = recentRequests.filter(
              (timestamp: Timestamp) => timestamp.toMillis() > windowStart,
            );

            if (validRequests.length >= max) {
              const oldestValidRequest = validRequests[0].toMillis();
              const resetTime = oldestValidRequest + windowMs;
              const retryAfter = Math.ceil((resetTime - nowUnix) / 1000);

              console.log(
                `[Fingerprint Rate Limit] Rate limit exceeded for fingerprint: ${fingerprint}, retry after: ${retryAfter}s`,
              );

              return { limited: true, retryAfter };
            }

            // Add current request and update, keeping only requests within the window
            const updatedRequests = [...validRequests, now];
            transaction.set(
              rateLimitRef,
              {
                requests: updatedRequests,
                lastUpdated: now,
              },
              { merge: true },
            );

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
