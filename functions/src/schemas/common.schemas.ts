import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

// Firestore specific schemas
export const TimestampSchema = z.custom<Timestamp>((val) => val instanceof Timestamp);

// Common ID schemas
export const accountIdSchema = z.string().min(1, "Account ID is required");
export const fingerprintIdSchema = z.string().min(1, "Fingerprint ID is required");
export const visitIdSchema = z.string().min(1, "Visit ID is required");
export const impressionIdSchema = z.string().min(1, "Impression ID is required");

// Common data schemas
export const walletAddressSchema = z.string().regex(/^[A-HJ-NP-Za-km-z1-9]*$/, {
  message: "Invalid wallet address format",
});

export const timestampSchema = z.number().int().positive();

// Common parameter schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// Common query parameter schemas
export const dateRangeSchema = z.object({
  startDate: timestampSchema.optional(),
  endDate: timestampSchema.optional(),
});

// Common response schemas
export const errorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  details: z.unknown().optional(),
});
