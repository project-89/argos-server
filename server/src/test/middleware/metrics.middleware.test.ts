import { describe, it, expect, beforeEach } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { withMetrics, MiddlewareMetrics } from "../../middleware/metrics.middleware";

describe("Metrics Middleware", () => {
  let metrics: MiddlewareMetrics;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    metrics = MiddlewareMetrics.getInstance();
    metrics.clear();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it("should track successful middleware execution", async () => {
    const successMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
      next();
    };

    const wrappedMiddleware = withMetrics(successMiddleware, "success-test");
    await wrappedMiddleware(mockReq as Request, mockRes as Response, mockNext);

    const metricsData = metrics.getMetrics("success-test");
    expect(metricsData["success-test"]).toHaveLength(1);
    expect(metricsData["success-test"][0].success).toBe(true);
    expect(metricsData["success-test"][0].duration).toBeGreaterThan(0);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should track middleware execution time", async () => {
    const slowMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
      setTimeout(() => next(), 100);
    };

    const wrappedMiddleware = withMetrics(slowMiddleware, "slow-test");
    await wrappedMiddleware(mockReq as Request, mockRes as Response, mockNext);

    const metricsData = metrics.getMetrics("slow-test");
    expect(metricsData["slow-test"][0].duration).toBeGreaterThan(0);
    expect(typeof metricsData["slow-test"][0].duration).toBe("number");
  });

  it("should track failed middleware execution", async () => {
    const errorMiddleware = () => {
      throw new Error("Test error");
    };

    const wrappedMiddleware = withMetrics(errorMiddleware, "error-test");

    await expect(
      wrappedMiddleware(mockReq as Request, mockRes as Response, mockNext),
    ).rejects.toThrow("Test error");

    const metricsData = metrics.getMetrics("error-test");
    expect(metricsData["error-test"][0].success).toBe(false);
    expect(metricsData["error-test"][0].error).toBe("Test error");
  });

  it("should handle async middleware", async () => {
    const asyncMiddleware = async (_req: Request, _res: Response, next: NextFunction) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      next();
    };

    const wrappedMiddleware = withMetrics(asyncMiddleware, "async-test");
    await wrappedMiddleware(mockReq as Request, mockRes as Response, mockNext);

    const metricsData = metrics.getMetrics("async-test");
    expect(metricsData["async-test"][0].success).toBe(true);
    expect(metricsData["async-test"][0].duration).toBeGreaterThan(45);
  });

  it("should calculate average execution time", async () => {
    const fastMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();
    const slowMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
      setTimeout(() => next(), 100);
    };

    const wrappedFast = withMetrics(fastMiddleware, "avg-test");
    const wrappedSlow = withMetrics(slowMiddleware, "avg-test");

    await wrappedFast(mockReq as Request, mockRes as Response, mockNext);
    await wrappedSlow(mockReq as Request, mockRes as Response, mockNext);

    const avgTime = metrics.getAverageTime("avg-test");
    expect(avgTime).toBeGreaterThan(0);
    expect(typeof avgTime).toBe("number");
  });

  it("should calculate error rate", async () => {
    const successMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();
    const errorMiddleware = () => {
      throw new Error("Test error");
    };

    const wrappedSuccess = withMetrics(successMiddleware, "error-rate-test");
    const wrappedError = withMetrics(errorMiddleware, "error-rate-test");

    await wrappedSuccess(mockReq as Request, mockRes as Response, mockNext);
    await expect(wrappedError(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow();

    const errorRate = metrics.getErrorRate("error-rate-test");
    expect(errorRate).toBe(50); // 1 error out of 2 calls = 50%
  });

  it("should handle middleware that returns a response", async () => {
    const responseMiddleware = (_req: Request, res: Response) => {
      return res.status(200).json({ success: true });
    };

    const wrappedMiddleware = withMetrics(responseMiddleware, "response-test");
    await wrappedMiddleware(mockReq as Request, mockRes as Response, mockNext);

    const metricsData = metrics.getMetrics("response-test");
    expect(metricsData["response-test"][0].success).toBe(true);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });
});
