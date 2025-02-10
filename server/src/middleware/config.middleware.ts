/**
 * Configuration manager for middleware settings
 * Provides a centralized way to manage middleware configuration
 */
export class MiddlewareConfig {
  private static instance: MiddlewareConfig;
  private config: Record<string, any> = {};
  private defaults: Record<string, any> = {};

  private constructor() {
    // Initialize with default configurations
    this.defaults = {
      rateLimit: {
        ip: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 300, // 300 requests per hour
        },
        fingerprint: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 1000, // 1000 requests per hour
        },
      },
      cors: {
        credentials: true,
        maxAge: 86400, // 24 hours
      },
      validation: {
        strict: true,
        stripUnknown: true,
      },
    };
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MiddlewareConfig {
    if (!MiddlewareConfig.instance) {
      MiddlewareConfig.instance = new MiddlewareConfig();
    }
    return MiddlewareConfig.instance;
  }

  /**
   * Set configuration for a specific key
   *
   * @example
   * const config = MiddlewareConfig.getInstance();
   * config.set("rateLimit.ip", { max: 500, windowMs: 30 * 60 * 1000 });
   */
  set(key: string, value: any): void {
    const parts = key.split(".");
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {};
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Get configuration for a specific key
   * Falls back to default values if not set
   *
   * @example
   * const config = MiddlewareConfig.getInstance();
   * const ipRateLimit = config.get("rateLimit.ip");
   */
  get<T = any>(key: string): T {
    const parts = key.split(".");
    let current: any = this.config;
    let defaultCurrent: any = this.defaults;

    for (const part of parts) {
      current = current?.[part];
      defaultCurrent = defaultCurrent?.[part];

      if (current === undefined) {
        return defaultCurrent;
      }
    }

    return current;
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = {};
  }

  /**
   * Get all configuration including defaults
   */
  getAll(): Record<string, any> {
    return {
      ...this.defaults,
      ...this.config,
    };
  }
}
