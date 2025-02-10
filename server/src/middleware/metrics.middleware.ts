import { Request, Response, NextFunction } from "express";
import { MetricsData, Middleware } from "../schemas";

/**
 * Global metrics storage
 */
export class MiddlewareMetrics {
  private static instance: MiddlewareMetrics;
  private metrics: Record<string, MetricsData[]> = {};

  private constructor() {}

  static getInstance(): MiddlewareMetrics {
    if (!MiddlewareMetrics.instance) {
      MiddlewareMetrics.instance = new MiddlewareMetrics();
    }
    return MiddlewareMetrics.instance;
  }

  addMetric(data: MetricsData): void {
    this.metrics[data.name] = this.metrics[data.name] || [];
    this.metrics[data.name].push(data);
  }

  getMetrics(name?: string): Record<string, MetricsData[]> {
    if (name) {
      return { [name]: this.metrics[name] || [] };
    }
    return this.metrics;
  }

  clear(): void {
    this.metrics = {};
  }

  getAverageTime(name: string): number {
    const metrics = this.metrics[name] || [];
    if (metrics.length === 0) return 0;

    const totalTime = metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0);
    return totalTime / metrics.length;
  }

  getErrorRate(name: string): number {
    const metrics = this.metrics[name] || [];
    if (metrics.length === 0) return 0;

    const errors = metrics.filter((metric) => !metric.success).length;
    return (errors / metrics.length) * 100;
  }
}

/**
 * Wraps a middleware with performance metrics
 *
 * @example
 * // Basic usage
 * app.use(withMetrics(authMiddleware, "auth"));
 *
 * @example
 * // Get metrics
 * const metrics = MiddlewareMetrics.getInstance();
 * console.log(metrics.getAverageTime("auth"));
 */
export const withMetrics = (middleware: Middleware, name: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const metrics = MiddlewareMetrics.getInstance();
    const startTime = process.hrtime();

    const metricsData: MetricsData = {
      name,
      startTime,
      success: false,
    };

    try {
      const result = await middleware(req, res, next);
      metricsData.success = true;
      return result;
    } catch (error) {
      metricsData.success = false;
      metricsData.error = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      const endTime = process.hrtime();
      metricsData.endTime = endTime;
      metricsData.duration = (endTime[0] - startTime[0]) * 1000 + (endTime[1] - startTime[1]) / 1e6;

      metrics.addMetric(metricsData);

      if (process.env.NODE_ENV === "development") {
        console.log(`[Metrics] ${name}: ${metricsData.duration.toFixed(2)}ms`);
      }
    }
  };
};
