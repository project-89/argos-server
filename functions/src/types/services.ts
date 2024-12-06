// Service Types
export interface ValidateApiKeyResult {
  isValid: boolean;
  fingerprintId?: string;
}

export interface PriceServiceConfig {
  baseUrl: string;
  defaultCurrency: string;
  defaultTokens: string[];
}

export interface CacheConfig {
  maxAge: number;
  cleanupInterval: number;
  cleanupProbability: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  monthlyLimit: number;
  buffer: number;
}

export interface FirebaseConfig {
  region: string;
  maxInstances: number;
  minInstances: number;
  memory: string;
  timeoutSeconds: number;
}
