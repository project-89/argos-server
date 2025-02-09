import { RateLimitConfig } from "../../schemas";

export const DEFAULT_FINGERPRINT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 1000, // limit each fingerprint to 1000 requests per hour (more lenient for authenticated users)
} as const;

export const DEFAULT_IP_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 300, // limit each IP to 300 requests per hour (more restrictive to prevent DDoS)
} as const;
