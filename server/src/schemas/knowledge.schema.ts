import { z } from "zod";
import { AccountIdSchema, TimestampSchema } from "./common.schema";
import { AGENT_RANK } from "../constants";

// Schema for knowledge domains
export const KnowledgeDomainSchema = z.enum([
  "general",
  "finance",
  "science",
  "technology",
  "art",
  "history",
  "custom",
]);
export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;

// Schema for knowledge status
export const KnowledgeStatusSchema = z.enum(["active", "archived", "pending_review"]);
export type KnowledgeStatus = z.infer<typeof KnowledgeStatusSchema>;

// Base Knowledge schema
export const KnowledgeSchema = z.object({
  id: z.string(),
  ownerId: AccountIdSchema,
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  content: z.string(),
  domain: KnowledgeDomainSchema,
  tags: z.array(z.string()).optional(),
  status: KnowledgeStatusSchema.default("active"),
  requiredRank: z.nativeEnum(AGENT_RANK).default(AGENT_RANK.initiate),
  compressed: z.boolean().default(false),
  version: z.number().int().default(1),
  metadata: z.record(z.any()).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Knowledge = z.infer<typeof KnowledgeSchema>;

// Knowledge Share schema (for tracking shared knowledge)
export const KnowledgeShareSchema = z.object({
  id: z.string(),
  knowledgeId: z.string(),
  ownerId: AccountIdSchema,
  targetAgentId: z.string(),
  status: z.enum(["active", "revoked"]).default("active"),
  accessLevel: z.enum(["read", "modify"]).default("read"),
  expiresAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type KnowledgeShare = z.infer<typeof KnowledgeShareSchema>;

// Knowledge Transfer schema (for tracking knowledge transfers between agents)
export const KnowledgeTransferSchema = z.object({
  id: z.string(),
  knowledgeId: z.string(),
  sourceAgentId: z.string(),
  targetAgentId: z.string(),
  status: z.enum(["pending", "completed", "failed"]).default("pending"),
  transferMethod: z.enum(["copy", "move"]).default("copy"),
  completedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type KnowledgeTransfer = z.infer<typeof KnowledgeTransferSchema>;

// Request schemas
export const CompressKnowledgeRequestSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
    domain: KnowledgeDomainSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export type CompressKnowledgeRequest = z.infer<typeof CompressKnowledgeRequestSchema>;

export const DecompressKnowledgeRequestSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
    domain: KnowledgeDomainSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export type DecompressKnowledgeRequest = z.infer<typeof DecompressKnowledgeRequestSchema>;

export const CreateKnowledgeRequestSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    content: z.string().min(1, "Content is required"),
    domain: KnowledgeDomainSchema,
    tags: z.array(z.string()).optional(),
    requiredRank: z.nativeEnum(AGENT_RANK).optional(),
    compressed: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export type CreateKnowledgeRequest = z.infer<typeof CreateKnowledgeRequestSchema>;

export const UpdateKnowledgeRequestSchema = z.object({
  params: z.object({
    knowledgeId: z.string(),
  }),
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    content: z.string().optional(),
    domain: KnowledgeDomainSchema.optional(),
    tags: z.array(z.string()).optional(),
    status: KnowledgeStatusSchema.optional(),
    requiredRank: z.nativeEnum(AGENT_RANK).optional(),
    compressed: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
});
export type UpdateKnowledgeRequest = z.infer<typeof UpdateKnowledgeRequestSchema>;

export const GetKnowledgeRequestSchema = z.object({
  params: z.object({
    knowledgeId: z.string(),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
export type GetKnowledgeRequest = z.infer<typeof GetKnowledgeRequestSchema>;

export const ListKnowledgeRequestSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    domain: KnowledgeDomainSchema.optional(),
    status: KnowledgeStatusSchema.optional(),
    limit: z.string().transform(Number).optional().default("20"),
    offset: z.string().transform(Number).optional().default("0"),
  }),
});
export type ListKnowledgeRequest = z.infer<typeof ListKnowledgeRequestSchema>;

export const ShareKnowledgeRequestSchema = z.object({
  params: z.object({
    knowledgeId: z.string(),
  }),
  body: z.object({
    targetAgentId: z.string(),
    accessLevel: z.enum(["read", "modify"]).default("read"),
    expiresAt: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
  }),
  query: z.object({}).optional(),
});
export type ShareKnowledgeRequest = z.infer<typeof ShareKnowledgeRequestSchema>;

export const TransferKnowledgeRequestSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({
    knowledgeId: z.string(),
    sourceAgentId: z.string(),
    targetAgentId: z.string(),
    transferMethod: z.enum(["copy", "move"]).default("copy"),
  }),
  query: z.object({}).optional(),
});
export type TransferKnowledgeRequest = z.infer<typeof TransferKnowledgeRequestSchema>;

// Response schemas
export const KnowledgeResponseSchema = KnowledgeSchema;
export type KnowledgeResponse = z.infer<typeof KnowledgeResponseSchema>;

export const CompressKnowledgeResponseSchema = z.object({
  compressedContent: z.string(),
  originalLength: z.number(),
  compressedLength: z.number(),
  compressionRatio: z.number(),
});
export type CompressKnowledgeResponse = z.infer<typeof CompressKnowledgeResponseSchema>;

export const DecompressKnowledgeResponseSchema = z.object({
  content: z.string(),
  decompressedLength: z.number(),
  originalLength: z.number(),
});
export type DecompressKnowledgeResponse = z.infer<typeof DecompressKnowledgeResponseSchema>;

export const ListKnowledgeResponseSchema = z.object({
  items: z.array(KnowledgeResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type ListKnowledgeResponse = z.infer<typeof ListKnowledgeResponseSchema>;
