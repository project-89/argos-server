import { Request, Response, NextFunction } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/collections";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 300, // limit each IP to 300 requests per hour (more restrictive to prevent DDoS)
};

export const ipRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs } = { ...DEFAULT_CONFIG, ...config };
  // Use environment variables or fallback to config/default
  const isDisabled =
    process.env.RATE_LIMIT_DISABLED === "true" || process.env.IP_RATE_LIMIT_DISABLED === "true";
  const max = process.env.IP_RATE_LIMIT_MAX
    ? parseInt(process.env.IP_RATE_LIMIT_MAX, 10)
    : config.max || DEFAULT_CONFIG.max;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if rate limiting is explicitly disabled
    if (isDisabled) {
      console.log("[IP Rate Limit] Rate limiting is disabled");
      next();
      return;
    }

    console.log(`[IP Rate Limit] Using max limit of ${max} requests per ${windowMs}ms`);

    try {
      const db = getFirestore();
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown";
      const now = Date.now();

      console.log(`[IP Rate Limit] Processing request from IP: ${ip}, path: ${req.path}`);

      // Use a transaction to ensure atomic updates
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const result = await db.runTransaction(async (transaction) => {
            const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ip:${ip}`);
            const doc = await transaction.get(rateLimitRef);
            const data = doc.data();

            // Get recent requests within the window
            const recentRequests = data?.requests || [];
            const windowStart = now - windowMs;

            // Filter out old requests
            const validRequests = recentRequests.filter(
              (timestamp: number) => timestamp > windowStart,
            );

            if (validRequests.length >= max) {
              const oldestValidRequest = validRequests[0];
              const resetTime = oldestValidRequest + windowMs;
              const retryAfter = Math.ceil((resetTime - now) / 1000);

              console.log(
                `[IP Rate Limit] Rate limit exceeded for IP: ${ip}, retry after: ${retryAfter}s`,
              );

              return { limited: true, retryAfter };
            }

            // Add current request and update, keeping only requests within the window
            const updatedRequests = [...validRequests, now];
            transaction.set(
              rateLimitRef,
              {
                requests: updatedRequests,
                lastUpdated: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );

            console.log(
              `[IP Rate Limit] Updated request count for IP: ${ip}, new count: ${updatedRequests.length}`,
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
          console.error(`[IP Rate Limit] Transaction failed (attempt ${retries + 1}):`, error);
          retries++;
          if (retries === maxRetries) {
            throw error;
          }
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, retries)));
        }
      }
    } catch (error) {
      console.error("[IP Rate Limit] Error:", error);
      res.status(500).json({
        success: false,
        error: "Rate limit check failed",
      });
    }
  };
};
