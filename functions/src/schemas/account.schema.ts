import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { walletAddressSchema, accountIdSchema, fingerprintIdSchema } from "./common.schemas";

// Base schema for Account in Firestore
export const AccountSchema = z.object({
  id: accountIdSchema,
  walletAddress: walletAddressSchema,
  fingerprintId: fingerprintIdSchema,
  createdAt: z.instanceof(Timestamp),
  lastLogin: z.instanceof(Timestamp),
  status: z.enum(["active", "suspended"]),
  metadata: z.record(z.any()),
});

// Request validation schemas
export const CreateAccountRequestSchema = z.object({
  body: z.object({
    walletAddress: walletAddressSchema,
    signature: z.string().min(1, "Signature is required"),
    message: z.string().min(1, "Message is required"),
    fingerprintId: fingerprintIdSchema.optional(),
    transitoryFingerprintId: fingerprintIdSchema.optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const GetAccountRequestSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    accountId: accountIdSchema,
  }),
});

export const UpdateAccountRequestSchema = z.object({
  params: z.object({
    accountId: accountIdSchema,
  }),
  body: z
    .object({
      status: z.enum(["active", "suspended"]).optional(),
      name: z.string().optional(),
      preferences: z.record(z.unknown()).optional(),
    })
    .strict(),
  query: z.object({}).optional(),
});

export const LinkFingerprintRequestSchema = z.object({
  params: z.object({
    accountId: accountIdSchema,
    fingerprintId: fingerprintIdSchema,
  }),
  body: z.object({
    signature: z.string().min(1, "Signature is required"),
  }),
  query: z.object({}).optional(),
});

// Response schema
export const AccountResponseSchema = z.object({
  id: accountIdSchema,
  walletAddress: walletAddressSchema,
  fingerprintId: fingerprintIdSchema,
  status: z.enum(["active", "suspended"]),
  createdAt: z.instanceof(Timestamp),
  lastLogin: z.instanceof(Timestamp),
  metadata: z.record(z.any()),
});

// Export types inferred from schemas
export type Account = z.infer<typeof AccountSchema>;
export type AccountResponse = z.infer<typeof AccountResponseSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type GetAccountRequest = z.infer<typeof GetAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type LinkFingerprintRequest = z.infer<typeof LinkFingerprintRequestSchema>;
