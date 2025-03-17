import { z } from "zod";
import { ERROR_MESSAGES } from "../constants";

// Schema for getting current prices
export const getCurrentPriceSchema = z.object({
  query: z.object({
    symbols: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : [])), // Allow comma-separated symbols in query
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

// Schema for getting price history
export const getPriceHistorySchema = z.object({
  params: z.object({
    tokenId: z.string({
      required_error: ERROR_MESSAGES.TOKEN_NOT_FOUND,
      invalid_type_error: "Token ID must be a string",
    }),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

// Response schemas for TypeScript types
export const PriceResponseSchema = z.object({
  symbol: z.string(),
  usd: z.number(),
  usd_24h_change: z.number(),
});

export const PriceHistoryPointSchema = z.object({
  price: z.number(),
  createdAt: z.number(), // Unix timestamp
});

export const PriceHistoryResponseSchema = z.array(PriceHistoryPointSchema);

// MongoDB cache schema for price data
export const PriceCacheSchema = z.object({
  symbol: z.string(), // The token symbol (serving as the _id in MongoDB)
  usd: z.number(),
  usd_24h_change: z.number(),
  createdAt: z.number(), // Timestamp when the cache was created
  history: z.array(PriceHistoryPointSchema).optional(), // Optional price history data
  metadata: z.record(z.string(), z.unknown()).optional(), // Additional metadata
});

// Export types
export type GetCurrentPriceRequest = z.infer<typeof getCurrentPriceSchema>;
export type GetPriceHistoryRequest = z.infer<typeof getPriceHistorySchema>;
export type PriceResponse = z.infer<typeof PriceResponseSchema>;
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>;
export type PriceHistoryResponse = z.infer<typeof PriceHistoryResponseSchema>;
export type PriceCache = z.infer<typeof PriceCacheSchema>;
