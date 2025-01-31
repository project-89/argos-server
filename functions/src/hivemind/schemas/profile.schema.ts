import { z } from "zod";
import { ContactInfoSchema, PreferencesSchema } from "./common.schema";

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
