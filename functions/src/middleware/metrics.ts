import { Request, Response, NextFunction } from "express";

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response> | void | Response;

interface MetricsData {
  name: string;
  startTime: [number, number];
  endTime?: [number, number];
  duration?: number;
  success: boolean;
  error?: string;
}

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
      const result = await new Promise<void | Response>((resolve, reject) => {
        try {
          const middlewareResult = middleware(req, res, (err?: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });

          // Handle middleware that returns a Response
          if (middlewareResult instanceof Promise) {
            middlewareResult.then(resolve).catch(reject);
          } else {
            resolve(middlewareResult);
          }
        } catch (error) {
          reject(error);
        }
      });

      metricsData.success = true;

      // If middleware returned a Response, return it
      if (result instanceof Response) {
        return result;
      }
    } catch (error) {
      metricsData.success = false;
      metricsData.error = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      metricsData.endTime = process.hrtime();
      metricsData.duration =
        (metricsData.endTime[0] - startTime[0]) * 1000 +
        (metricsData.endTime[1] - startTime[1]) / 1e6;

      metrics.addMetric(metricsData);

      // Log metrics in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Metrics] ${name}: ${metricsData.duration.toFixed(2)}ms`);
      }
    }

    next();
  };
};
