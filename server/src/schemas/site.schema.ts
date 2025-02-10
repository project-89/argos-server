import { z } from "zod";
import { TimestampSchema } from ".";

// Domain Models
export const SiteSettingsSchema = z.object({
  notifications: z.boolean(),
  privacy: z.enum(["public", "private"]),
});

export const SiteSchema = z.object({
  id: z.string(),
  domain: z.string(),
  fingerprintId: z.string(),
  lastVisited: TimestampSchema,
  title: z.string(),
  visits: z.number(),
  settings: SiteSettingsSchema,
  createdAt: TimestampSchema,
});

// Request/Response Validation Schemas
export const CreateSiteSchema = z.object({
  body: z.object({
    domain: z.string(),
    title: z.string().optional(),
    settings: SiteSettingsSchema.optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const UpdateSiteSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    settings: SiteSettingsSchema.optional(),
  }),
  params: z.object({
    siteId: z.string(),
  }),
  query: z.object({}),
});

export const GetSiteSchema = z.object({
  body: z.object({}),
  params: z.object({
    siteId: z.string(),
  }),
  query: z.object({}),
});

export const ListSitesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  }),
});

// Type Exports
export type Site = z.infer<typeof SiteSchema>;
export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type CreateSiteRequest = z.infer<typeof CreateSiteSchema>;
export type UpdateSiteRequest = z.infer<typeof UpdateSiteSchema>;
export type GetSiteRequest = z.infer<typeof GetSiteSchema>;
export type ListSitesRequest = z.infer<typeof ListSitesSchema>;
