import { RateLimitConfig } from "../../schemas";

// Default rate limits
export const DEFAULT_FINGERPRINT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: process.env.FINGERPRINT_RATE_LIMIT_MAX
    ? parseInt(process.env.FINGERPRINT_RATE_LIMIT_MAX)
    : 1000, // limit each fingerprint to 1000 requests per hour (more lenient for authenticated users)
} as const;

export const DEFAULT_IP_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: process.env.IP_RATE_LIMIT_MAX ? parseInt(process.env.IP_RATE_LIMIT_MAX) : 300, // limit each IP to 300 requests per hour (more restrictive to prevent DDoS)
} as const;

// Health endpoint specific rate limit
export const HEALTH_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // limit to 1 request per second on average
} as const;

// Initialize middleware configuration with defaults
export const initializeRateLimits = (): void => {
  const { MiddlewareConfig } = require("../../middleware/config.middleware");
  const middlewareConfig = MiddlewareConfig.getInstance();

  middlewareConfig.set("rateLimit.ip", DEFAULT_IP_RATE_LIMIT_CONFIG);
  middlewareConfig.set("rateLimit.fingerprint", DEFAULT_FINGERPRINT_RATE_LIMIT_CONFIG);
  middlewareConfig.set("rateLimit.health", HEALTH_RATE_LIMIT_CONFIG);
};
