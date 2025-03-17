import { z } from "zod";
import { WalletAddressSchema, AccountIdSchema, FingerprintIdSchema, TimestampSchema } from ".";
import { ACCOUNT_ROLE } from "../constants";

export const AccountStatusSchema = z.enum(["active", "suspended"]);

// Base schema for Account in MongoDB
export const AccountSchema = z.object({
  id: AccountIdSchema,
  walletAddress: WalletAddressSchema,
  fingerprintId: FingerprintIdSchema,
  createdAt: TimestampSchema,
  lastLogin: TimestampSchema,
  status: z.enum(["active", "suspended"]),
  roles: z.array(z.nativeEnum(ACCOUNT_ROLE)).default([ACCOUNT_ROLE.user]),
  anonUserId: z.string().optional(),
  metadata: z.record(z.any()),
});

// Request validation schemas
export const CreateAccountRequestSchema = z.object({
  body: z.object({
    walletAddress: WalletAddressSchema,
    signature: z.string().min(1, "Signature is required"),
    message: z.string().min(1, "Message is required"),
    fingerprintId: FingerprintIdSchema,
    onboardingId: z.string(), // Required to link with onboarding process
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const GetAccountRequestSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    accountId: AccountIdSchema,
  }),
});

export const UpdateAccountRequestSchema = z.object({
  params: z.object({
    accountId: AccountIdSchema,
  }),
  body: z
    .object({
      status: z.enum(["active", "suspended"]).optional(),
      name: z.string().optional(),
      preferences: z.record(z.unknown()).optional(),
      roles: z.array(z.nativeEnum(ACCOUNT_ROLE)).optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict(),
  query: z.object({}).optional(),
});

export const LinkFingerprintRequestSchema = z.object({
  params: z.object({
    accountId: AccountIdSchema,
    fingerprintId: FingerprintIdSchema,
  }),
  body: z.object({
    signature: z.string().min(1, "Signature is required"),
  }),
  query: z.object({}).optional(),
});

// Response schema
export const AccountResponseSchema = z.object({
  id: AccountIdSchema,
  walletAddress: WalletAddressSchema,
  fingerprintId: FingerprintIdSchema,
  status: z.enum(["active", "suspended"]),
  roles: z.array(z.nativeEnum(ACCOUNT_ROLE)),
  createdAt: TimestampSchema,
  lastLogin: TimestampSchema,
  metadata: z.record(z.any()),
});

// Export types inferred from schemas
export type Account = z.infer<typeof AccountSchema>;
export type AccountResponse = z.infer<typeof AccountResponseSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type GetAccountRequest = z.infer<typeof GetAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type LinkFingerprintRequest = z.infer<typeof LinkFingerprintRequestSchema>;
