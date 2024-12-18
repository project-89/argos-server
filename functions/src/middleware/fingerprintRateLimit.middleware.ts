import { Request, Response, NextFunction } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each fingerprint to 100 requests per windowMs
};

const getRateLimitKey = (fingerprintId: string, endpoint: string): string => {
  // Replace slashes with underscores and remove any other invalid characters
  const sanitizedEndpoint = endpoint.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9-_]/g, "");
  return `fingerprint_${fingerprintId}_${sanitizedEndpoint}`;
};

const getEndpointPath = (req: Request): string => {
  // Get the full path to properly track rate limits per endpoint
  return req.path;
};

export const fingerprintRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs, max } = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.RATE_LIMIT_ENABLED === "false") {
      console.log("[Fingerprint Rate Limit] Rate limiting is disabled");
      next();
      return;
    }

    try {
      const db = getFirestore();
      const fingerprintId = req.body.fingerprintId;
      const endpoint = getEndpointPath(req);

      if (!fingerprintId) {
        console.log("[Fingerprint Rate Limit] No fingerprintId in request body");
        res.status(400).json({
          success: false,
          error: "fingerprintId is required",
        });
        return;
      }

      const now = Date.now();
      const rateLimitKey = getRateLimitKey(fingerprintId, endpoint);

      console.log(
        `[Fingerprint Rate Limit] Processing request for fingerprint: ${fingerprintId}, endpoint: ${endpoint}`,
      );

      // Use a transaction to ensure atomic updates
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const result = await db.runTransaction(async (transaction) => {
            const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(rateLimitKey);
            const doc = await transaction.get(rateLimitRef);

            if (!doc.exists) {
              console.log(
                `[Fingerprint Rate Limit] First request for fingerprint: ${fingerprintId} at endpoint: ${endpoint}`,
              );
              // Initialize with the current request
              const initialData = {
                requests: [now],
                createdAt: FieldValue.serverTimestamp(),
                lastUpdated: FieldValue.serverTimestamp(),
                type: "fingerprint",
                fingerprintId,
                endpoint,
                windowMs,
                max,
              };
              transaction.set(rateLimitRef, initialData);
              console.log(`[Fingerprint Rate Limit] Initialized rate limit data:`, initialData);
              return { limited: false, count: 1 };
            }

            const data = doc.data();
            if (!data) {
              console.error(
                `[Fingerprint Rate Limit] Rate limit data is missing for key: ${rateLimitKey}`,
              );
              throw new Error("Rate limit data is missing");
            }

            // Get requests within the current window
            const requests = (data.requests as number[]) || [];
            const windowStart = now - windowMs;
            const recentRequests = requests.filter((time) => time > windowStart);

            console.log(`[Fingerprint Rate Limit] Current state for ${fingerprintId}:`, {
              totalRequests: requests.length,
              recentRequests: recentRequests.length,
              windowStart: new Date(windowStart).toISOString(),
              now: new Date(now).toISOString(),
              max,
            });

            if (recentRequests.length >= max) {
              const oldestRequest = Math.min(...recentRequests);
              const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
              console.log(`[Fingerprint Rate Limit] Rate limit exceeded:`, {
                fingerprintId,
                endpoint,
                recentRequests: recentRequests.length,
                max,
                retryAfter,
                oldestRequest: new Date(oldestRequest).toISOString(),
              });
              return { limited: true, retryAfter, count: recentRequests.length };
            }

            // Clean up old requests and add the new one atomically
            const updatedRequests = [...recentRequests, now];
            const updateData = {
              requests: updatedRequests,
              lastUpdated: FieldValue.serverTimestamp(),
              windowMs,
              max,
            };

            transaction.update(rateLimitRef, updateData);
            console.log(`[Fingerprint Rate Limit] Updated rate limit data:`, {
              fingerprintId,
              endpoint,
              requestCount: updatedRequests.length,
              max,
              remaining: max - updatedRequests.length,
            });

            return { limited: false, count: updatedRequests.length };
          });

          if (result.limited) {
            console.log(`[Fingerprint Rate Limit] Sending rate limit response:`, {
              fingerprintId,
              endpoint,
              retryAfter: result.retryAfter,
            });
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
          // Wait before retrying with exponential backoff
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
