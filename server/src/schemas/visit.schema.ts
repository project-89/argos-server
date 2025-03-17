import { z } from "zod";
import { ERROR_MESSAGES } from "../constants";
import { TimestampSchema, SiteSettingsSchema } from ".";

// Domain Models
export const VisitSchema = z.object({
  id: z.string(),
  fingerprintId: z.string(),
  url: z.string(),
  title: z.string().optional(),
  siteId: z.string(),
  createdAt: TimestampSchema,
  clientIp: z.string().optional(),
  metadata: z.record(z.any()).optional(),
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
  updatedAt: TimestampSchema.optional(),
});

export const VisitPresenceSchema = z.object({
  status: z.enum(["online", "offline", "away"]),
  fingerprintId: z.string(),
  lastUpdated: z.number(),
  createdAt: z.number(),
});

// Visit Pattern Analysis Schemas
export const VisitPatternSchema = z.object({
  currentSite: z.string(),
  nextSite: z.string(),
  transitionCount: z.number(),
  averageTimeSpent: z.number(),
});

export const SiteEngagementSchema = z.object({
  siteId: z.string(),
  totalVisits: z.number(),
  averageTimeSpent: z.number(),
  returnRate: z.number(),
  commonNextSites: z.array(z.string()),
});

// Response Types
export const VisitResponseSchema = z.object({
  id: z.string().optional(),
  fingerprintId: z.string(),
  url: z.string(),
  title: z.string().optional(),
  siteId: z.string(),
  createdAt: z.number(),
  clientIp: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const SiteResponseSchema = z.object({
  id: z.string(),
  domain: z.string(),
  fingerprintId: z.string(),
  lastVisited: z.number(),
  title: z.string(),
  visits: z.number(),
  settings: SiteSettingsSchema,
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

export const VisitHistoryResponseSchema = z.object({
  id: z.string(),
  fingerprintId: z.string(),
  url: z.string(),
  title: z.string().optional(),
  siteId: z.string(),
  createdAt: z.number(),
  site: SiteResponseSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const VisitPatternAnalysisResponseSchema = z.object({
  patterns: z.array(VisitPatternSchema),
  engagement: z.array(SiteEngagementSchema),
});

// Request Validation Schemas
export const VisitLogSchema = z.object({
  body: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
    url: z
      .string({
        required_error: ERROR_MESSAGES.MISSING_URL,
        invalid_type_error: ERROR_MESSAGES.INVALID_URL,
      })
      .url(ERROR_MESSAGES.INVALID_URL),
    title: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const VisitPresenceRequestSchema = z.object({
  body: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
    status: z.enum(["online", "offline", "away"] as const, {
      invalid_type_error: ERROR_MESSAGES.INVALID_STATUS,
      required_error: ERROR_MESSAGES.MISSING_STATUS,
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const VisitRemoveSiteSchema = z.object({
  body: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
    siteId: z.string({
      required_error: ERROR_MESSAGES.SITE_NOT_FOUND,
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const VisitHistorySchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({}).optional(),
  query: z
    .object({
      limit: z.string().transform(Number).optional().default("50"),
      offset: z.string().transform(Number).optional().default("0"),
    })
    .optional(),
});

export const VisitPatternAnalysisSchema = z.object({
  params: z.object({
    fingerprintId: z.string({
      required_error: ERROR_MESSAGES.MISSING_FINGERPRINT,
      invalid_type_error: ERROR_MESSAGES.INVALID_FINGERPRINT,
    }),
  }),
  body: z.object({}).optional(),
  query: z
    .object({
      days: z.string().transform(Number).optional().default("30"),
    })
    .optional(),
});

// Type Exports
export type Visit = z.infer<typeof VisitSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type VisitPresence = z.infer<typeof VisitPresenceSchema>;
export type VisitResponse = z.infer<typeof VisitResponseSchema>;
export type SiteResponse = z.infer<typeof SiteResponseSchema>;
export type VisitHistoryResponse = z.infer<typeof VisitHistoryResponseSchema>;
export type VisitPattern = z.infer<typeof VisitPatternSchema>;
export type SiteEngagement = z.infer<typeof SiteEngagementSchema>;
export type VisitPatternAnalysisResponse = z.infer<typeof VisitPatternAnalysisResponseSchema>;

// Request Types
export type VisitLogRequest = z.infer<typeof VisitLogSchema>;
export type VisitPresenceRequest = z.infer<typeof VisitPresenceRequestSchema>;
export type VisitRemoveSiteRequest = z.infer<typeof VisitRemoveSiteSchema>;
export type VisitHistoryRequest = z.infer<typeof VisitHistorySchema>;
export type VisitPatternAnalysisRequest = z.infer<typeof VisitPatternAnalysisSchema>;
