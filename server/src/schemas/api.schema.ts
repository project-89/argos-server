import { z } from "zod";

// API Response Schemas
export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  expected: z.string().optional(),
  received: z.string().optional(),
});

export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  requestId: z.string(),
  timestamp: z.number(),
  details: z.array(z.any()).optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  requestId: z.string(),
  timestamp: z.number(),
  details: z.array(ApiErrorDetailSchema).optional(),
});

export const ApiResponseSchema = z.union([ApiSuccessResponseSchema, ApiErrorResponseSchema]);

// Type Exports
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;
export type ApiSuccessResponse<T = any> = z.infer<typeof ApiSuccessResponseSchema> & { data: T };
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
