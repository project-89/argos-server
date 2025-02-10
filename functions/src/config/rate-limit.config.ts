import { Express } from "express";
import { MiddlewareConfig } from "../middleware/config.middleware";
import { withMetrics, ipRateLimit } from "../middleware";

export const configureRateLimits = (app: Express): void => {
  // Initialize middleware configuration
  const middlewareConfig = MiddlewareConfig.getInstance();

  // Configure rate limits
  middlewareConfig.set("rateLimit.ip", {
    windowMs: 60 * 60 * 1000,
    max: process.env.IP_RATE_LIMIT_MAX ? parseInt(process.env.IP_RATE_LIMIT_MAX) : 300,
  });

  middlewareConfig.set("rateLimit.fingerprint", {
    windowMs: 60 * 60 * 1000,
    max: process.env.FINGERPRINT_RATE_LIMIT_MAX
      ? parseInt(process.env.FINGERPRINT_RATE_LIMIT_MAX)
      : 1000,
  });

  middlewareConfig.set("rateLimit.health", {
    windowMs: 60 * 1000,
    max: 60,
  });

  // Health check rate limiting
  const healthMiddleware = withMetrics(
    ipRateLimit(middlewareConfig.get("rateLimit.health")),
    "healthIpRateLimit",
  );

  // Apply health check rate limiting
  app.use("/health", healthMiddleware);
  app.use("/metrics", healthMiddleware);
};
