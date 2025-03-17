import { z } from "zod";

import { StatsResponseSchema, ContactInfoSchema, PreferencesSchema } from ".";

// Request Validation Schemas
export const ProfileCreateSchema = z.object({
  body: z.object({
    walletAddress: z.string(),
    fingerprintId: z.string(),
    username: z.string().min(3).max(30),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    contactInfo: ContactInfoSchema.optional(),
    preferences: PreferencesSchema.optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const ProfileGetSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const ProfileGetByWalletSchema = z.object({
  params: z.object({
    walletAddress: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const ProfileUpdateSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    contactInfo: ContactInfoSchema.optional(),
    preferences: PreferencesSchema.optional(),
  }),
  query: z.object({}).optional(),
});

export const ProfileSearchSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    searchTerm: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
});

// Database Model Schema
export const ProfileSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  fingerprintId: z.string(),
  username: z.string(),
  bio: z.string(),
  avatarUrl: z.string(),
  contactInfo: ContactInfoSchema,
  preferences: PreferencesSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

// API Response Schema
export const ProfileResponseSchema = ProfileSchema;

export const ProfileWithStatsResponseSchema = ProfileResponseSchema.extend({
  stats: StatsResponseSchema.nullable(),
});

// Export inferred types
export type ProfileCreateRequest = z.infer<typeof ProfileCreateSchema>;
export type ProfileGetRequest = z.infer<typeof ProfileGetSchema>;
export type ProfileGetByWalletRequest = z.infer<typeof ProfileGetByWalletSchema>;
export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateSchema>;
export type ProfileSearchRequest = z.infer<typeof ProfileSearchSchema>;

// Database Model Types
export type Profile = z.infer<typeof ProfileSchema>;

// API Response Types
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type ProfileWithStatsResponse = z.infer<typeof ProfileWithStatsResponseSchema>;
