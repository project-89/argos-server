import { z } from "zod";
import { TimestampSchema } from "./common.schema";

// Domain Models
export const ApiKeySchema = z.object({
  id: z.string(),
  key: z.string(),
  fingerprintId: z.string(),
  createdAt: TimestampSchema,
  active: z.boolean(),
});

// Request/Response Validation Schemas
export const CreateApiKeySchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const RevokeApiKeySchema = z.object({
  body: z.object({}),
  params: z.object({
    keyId: z.string(),
  }),
  query: z.object({}),
});

export const ValidateApiKeySchema = z.object({
  body: z.object({}),
  params: z.object({
    key: z.string(),
  }),
  query: z.object({}),
});

// Type Exports
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeySchema>;
export type RevokeApiKeyRequest = z.infer<typeof RevokeApiKeySchema>;
export type ValidateApiKeyRequest = z.infer<typeof ValidateApiKeySchema>;
