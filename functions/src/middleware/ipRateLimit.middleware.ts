import { Request, Response, NextFunction } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each IP to 100 requests per windowMs
};

export const ipRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs } = { ...DEFAULT_CONFIG, ...config };
  // Use environment variable for max if set, otherwise use config or default
  const max = process.env.IP_RATE_LIMIT_MAX
    ? parseInt(process.env.IP_RATE_LIMIT_MAX, 10)
    : config.max || DEFAULT_CONFIG.max;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check both global rate limiting and IP-specific rate limiting
    if (
      process.env.RATE_LIMIT_ENABLED === "false" ||
      process.env.IP_RATE_LIMIT_ENABLED === "false" ||
      process.env.IP_RATE_LIMIT_ENABLED === undefined
    ) {
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

      console.log(
        `[IP Rate Limit] Processing request from IP: ${ip}, path: ${req.path}, IP_RATE_LIMIT_ENABLED: ${process.env.IP_RATE_LIMIT_ENABLED}`,
      );

      // Use a transaction to ensure atomic updates
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const result = await db.runTransaction(async (transaction) => {
            const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ip:${ip}`);
            const doc = await transaction.get(rateLimitRef);

            if (!doc.exists) {
              console.log(`[IP Rate Limit] First request from IP: ${ip}`);
              transaction.set(rateLimitRef, {
                requests: [now],
                createdAt: FieldValue.serverTimestamp(),
                type: "ip",
              });
              return { limited: false, count: 1 };
            }

            const data = doc.data();
            if (!data) {
              throw new Error("Rate limit data is missing");
            }

            // Get requests within the current window
            const requests = (data.requests as number[]) || [];
            const windowStart = now - windowMs;
            const recentRequests = requests.filter((time) => time > windowStart);

            console.log(
              `[IP Rate Limit] IP: ${ip}, Recent requests: ${recentRequests.length}, Max: ${max}, Window: ${new Date(windowStart).toISOString()} to ${new Date(now).toISOString()}`,
            );

            if (recentRequests.length >= max) {
              const oldestRequest = Math.min(...recentRequests);
              const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
              console.log(
                `[IP Rate Limit] Rate limit exceeded for IP: ${ip}, retry after: ${retryAfter}s`,
              );
              return { limited: true, retryAfter, count: recentRequests.length };
            }

            // Add current request and update
            const updatedRequests = [...recentRequests, now];
            transaction.update(rateLimitRef, {
              requests: updatedRequests,
              lastUpdated: FieldValue.serverTimestamp(),
            });

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
