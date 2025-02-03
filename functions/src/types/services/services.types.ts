export interface RateLimitConfig {
  requestsPerMinute: number;
  monthlyLimit: number;
  buffer: number;
}
