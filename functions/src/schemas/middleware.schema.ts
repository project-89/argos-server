import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// Define the Middleware type as a Zod schema
export const MiddlewareSchema = z
  .function()
  .args(z.custom<Request>(), z.custom<Response>(), z.custom<NextFunction>())
  .returns(
    z.union([z.void(), z.promise(z.void()), z.custom<Response>(), z.promise(z.custom<Response>())]),
  );

// Define the MetricsData schema
export const MetricsDataSchema = z.object({
  name: z.string(),
  startTime: z.tuple([z.number(), z.number()]),
  endTime: z.tuple([z.number(), z.number()]).optional(),
  duration: z.number().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

// Define the RateLimitConfig schema
export const RateLimitConfigSchema = z.object({
  windowMs: z.number(),
  max: z.number(),
});

// Export inferred types
export type Middleware = z.infer<typeof MiddlewareSchema>;
export type MetricsData = z.infer<typeof MetricsDataSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
