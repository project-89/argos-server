import { z } from "zod";

export const CreateImpressionSchema = z.object({
  fingerprintId: z.string(),
  type: z.string(),
  data: z.record(z.any()),
  source: z.string().optional(),
  sessionId: z.string().optional(),
});

export const GetImpressionsSchema = z.object({
  fingerprintId: z.string(),
  type: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().positive().optional(),
  sessionId: z.string().optional(),
});

export const DeleteImpressionsSchema = z.object({
  fingerprintId: z.string(),
  type: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  sessionId: z.string().optional(),
});
