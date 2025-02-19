import { Request, Response, NextFunction } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, DEFAULT_IP_RATE_LIMIT_CONFIG } from "../constants";
import { sendWarning } from "../utils";
import { Fingerprint, RateLimitConfig } from "../schemas";

const SUSPICIOUS_IP_THRESHOLD = 10; // Number of requests needed to establish an IP as trusted
const SUSPICIOUS_TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const ipRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs } = { ...DEFAULT_IP_RATE_LIMIT_CONFIG, ...config } as RateLimitConfig;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check environment variables on each request
    const isDisabled =
      process.env.RATE_LIMIT_DISABLED === "true" || process.env.IP_RATE_LIMIT_DISABLED === "true";
    const max = process.env.IP_RATE_LIMIT_MAX
      ? parseInt(process.env.IP_RATE_LIMIT_MAX, 10)
      : config.max || DEFAULT_IP_RATE_LIMIT_CONFIG.max;

    console.log("[IP Rate Limit] Starting middleware execution with config:", {
      isDisabled,
      max,
      windowMs,
      env: {
        RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
        IP_RATE_LIMIT_DISABLED: process.env.IP_RATE_LIMIT_DISABLED,
        IP_RATE_LIMIT_MAX: process.env.IP_RATE_LIMIT_MAX,
        FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
      },
    });

    // Check if rate limiting is explicitly disabled
    if (isDisabled) {
      console.log("[IP Rate Limit] Rate limiting is disabled");
      next();
      return;
    }

    try {
      console.log("[IP Rate Limit] Getting Firestore instance...");
      const db = getFirestore();
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown";
      const now = Timestamp.now();
      const nowUnix = now.toMillis();

      console.log(`[IP Rate Limit] Processing request:`, {
        ip,
        path: req.path,
        fingerprintId: req.auth?.fingerprint.id,
        timestamp: nowUnix,
      });

      // Use a transaction to ensure atomic updates
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          console.log(`[IP Rate Limit] Starting transaction attempt ${retries + 1}`);
          const result = await db.runTransaction(async (transaction) => {
            const rateLimitRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ip:${ip}`);
            console.log(`[IP Rate Limit] Getting rate limit doc for ip:${ip}`);
            const doc = await transaction.get(rateLimitRef);
            const data = doc.data();
            console.log(`[IP Rate Limit] Current rate limit data:`, data);

            // Get recent requests within the window
            const recentRequests = data?.requests || [];
            const windowStart = nowUnix - windowMs;

            // Filter out old requests
            const validRequests = recentRequests.filter(
              (timestamp: Timestamp) => timestamp.toMillis() > windowStart,
            );

            console.log(`[IP Rate Limit] Valid requests in window: ${validRequests.length}`);

            if (validRequests.length >= max) {
              const oldestValidRequest = validRequests[0].toMillis();
              const resetTime = oldestValidRequest + windowMs;
              const retryAfter = Math.ceil((resetTime - nowUnix) / 1000);

              console.log(
                `[IP Rate Limit] Rate limit exceeded for IP: ${ip}, retry after: ${retryAfter}s`,
              );

              return { limited: true, retryAfter };
            }

            // Add current request and update, keeping only requests within the window
            const updatedRequests = [...validRequests, now];

            // Check for suspicious IP activity
            console.log("[IP Rate Limit] Checking for suspicious IP activity...");
            const isSuspicious = await checkSuspiciousIP(db, ip, req.auth?.fingerprint.id, now);
            console.log(`[IP Rate Limit] Suspicious IP check result:`, isSuspicious);

            if (isSuspicious) {
              console.log("[IP Rate Limit] Suspicious IP detected, sending warning");
              sendWarning(res, { ip }, "Suspicious IP activity detected");
            }

            console.log(
              `[IP Rate Limit] Updating rate limit doc with ${updatedRequests.length} requests`,
            );
            transaction.set(
              rateLimitRef,
              {
                requests: updatedRequests,
                lastUpdated: now,
                isSuspicious,
              },
              { merge: true },
            );

            console.log(
              `[IP Rate Limit] Updated request count for IP: ${ip}, new count: ${updatedRequests.length}, suspicious: ${isSuspicious}`,
            );
            return { limited: false, count: updatedRequests.length, isSuspicious };
          });

          if (result.limited) {
            console.log("[IP Rate Limit] Request limited");
            res.status(429).json({
              success: false,
              error: "Too many requests, please try again later",
            });
            return;
          }

          if (result.isSuspicious) {
            console.log("[IP Rate Limit] Request allowed but marked as suspicious");
          }

          next();
          return;
        } catch (error) {
          console.error(`[IP Rate Limit] Transaction failed (attempt ${retries + 1}):`, error);
          retries++;
          if (retries === maxRetries) {
            throw error;
          }
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

async function checkSuspiciousIP(
  db: FirebaseFirestore.Firestore,
  ip: string,
  fingerprintId: string | undefined,
  now: Timestamp,
): Promise<boolean> {
  console.log(`[IP Rate Limit] Checking suspicious IP: ${ip} for fingerprint: ${fingerprintId}`);

  // If no fingerprintId, this is a public route - skip suspicious check
  if (!fingerprintId) {
    console.log("[IP Rate Limit] No fingerprint ID, skipping suspicious check");
    return false;
  }

  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
  const fingerprintDoc = await fingerprintRef.get();

  if (!fingerprintDoc.exists) {
    console.log("[IP Rate Limit] Fingerprint not found");
    return false;
  }

  const data = fingerprintDoc.data() as Fingerprint;
  if (!data) {
    console.log("[IP Rate Limit] No fingerprint data");
    return false;
  }

  const ipMetadata = data.ipMetadata || {
    ipFrequency: {},
    lastSeenAt: {},
    suspiciousIps: [],
    primaryIp: undefined,
  };

  // Check if this IP is already marked as suspicious
  if (ipMetadata.suspiciousIps?.includes(ip)) {
    console.log("[IP Rate Limit] IP already marked as suspicious");
    return true;
  }

  // Get the primary IP and its frequency
  const [primaryIp, primaryFrequency] = Object.entries(ipMetadata.ipFrequency || {}).reduce(
    (a, b) => (a[1] > b[1] ? a : b),
    [ip, 0],
  );

  console.log("[IP Rate Limit] Primary IP check:", {
    primaryIp,
    primaryFrequency,
    threshold: SUSPICIOUS_IP_THRESHOLD,
  });

  // Check if we have an established primary IP
  const isPrimaryEstablished = primaryFrequency >= SUSPICIOUS_IP_THRESHOLD;
  const timeSinceCreation = now.toMillis() - data.createdAt.toMillis();
  const isWithinInitialWindow = timeSinceCreation <= SUSPICIOUS_TIME_WINDOW;

  console.log("[IP Rate Limit] Time window check:", {
    timeSinceCreation,
    isWithinInitialWindow,
    window: SUSPICIOUS_TIME_WINDOW,
  });

  // Only mark as suspicious if:
  // 1. We have an established primary IP
  // 2. We're outside the initial time window
  // 3. This IP is different from the primary IP
  const isSuspicious = isPrimaryEstablished && !isWithinInitialWindow && ip !== primaryIp;

  if (isSuspicious) {
    console.log("[IP Rate Limit] Marking IP as suspicious");
    // Update the fingerprint document to mark this IP as suspicious
    await fingerprintRef.update({
      "ipMetadata.suspiciousIps": [...(ipMetadata.suspiciousIps || []), ip],
    });
  }

  return isSuspicious;
}
