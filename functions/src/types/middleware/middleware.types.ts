import { Request, Response, NextFunction } from "express";

export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void> | Response | Promise<Response>;

export interface MetricsData {
  name: string;
  startTime: [number, number];
  endTime?: [number, number];
  duration?: number;
  success: boolean;
  error?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}
