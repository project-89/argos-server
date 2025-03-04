import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

// Knowledge format types
export const KnowledgeFormatSchema = z.enum([
  "standard", // Regular uncompressed format
  "compressed", // Compressed notation format
  "hierarchical", // Hierarchical structure format
]);

// Knowledge domain categories
export const KnowledgeDomainSchema = z.enum([
  "general",
  "technical",
  "scientific",
  "creative",
  "procedural",
  "conceptual",
]);

// Knowledge access levels
export const KnowledgeAccessLevelSchema = z.enum([
  "public", // Available to all agents
  "restricted", // Available to agents with specific ranks
  "private", // Available only to the owner and explicitly shared agents
]);

// Base schema for Knowledge in Firestore
export const KnowledgeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  content: z.string(), // The actual knowledge content (may be compressed)
  format: KnowledgeFormatSchema,
  domain: KnowledgeDomainSchema,
  accessLevel: KnowledgeAccessLevelSchema,
  ownerId: z.string(), // The agent or account that owns this knowledge
  metadata: z.record(z.any()),
  tags: z.array(z.string()).optional(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});

// Knowledge compression request
export const CompressKnowledgeRequestSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
    domain: KnowledgeDomainSchema.optional().default("general"),
    format: z.literal(KnowledgeFormatSchema.enum.standard),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Knowledge decompression request
export const DecompressKnowledgeRequestSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
    domain: KnowledgeDomainSchema.optional().default("general"),
    format: z.literal(KnowledgeFormatSchema.enum.compressed),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Create knowledge request
export const CreateKnowledgeRequestSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500),
    content: z.string().min(1, "Content is required"),
    format: KnowledgeFormatSchema,
    domain: KnowledgeDomainSchema,
    accessLevel: KnowledgeAccessLevelSchema,
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Get knowledge request
export const GetKnowledgeRequestSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    knowledgeId: z.string().uuid(),
  }),
});

// Update knowledge request
export const UpdateKnowledgeRequestSchema = z.object({
  params: z.object({
    knowledgeId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    content: z.string().optional(),
    format: KnowledgeFormatSchema.optional(),
    domain: KnowledgeDomainSchema.optional(),
    accessLevel: KnowledgeAccessLevelSchema.optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
});

// List knowledge request
export const ListKnowledgeRequestSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    domain: KnowledgeDomainSchema.optional(),
    format: KnowledgeFormatSchema.optional(),
    accessLevel: KnowledgeAccessLevelSchema.optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
  params: z.object({}).optional(),
});

// Share knowledge request
export const ShareKnowledgeRequestSchema = z.object({
  params: z.object({
    knowledgeId: z.string().uuid(),
  }),
  body: z.object({
    targetAgentId: z.string(), // Agent ID
    expiresAt: z.instanceof(Timestamp).optional(),
  }),
  query: z.object({}).optional(),
});

// Knowledge transfer request
export const TransferKnowledgeRequestSchema = z.object({
  body: z.object({
    sourceAgentId: z.string(), // Source agent ID
    targetAgentId: z.string(), // Target agent ID
    knowledgeIds: z.array(z.string().uuid()),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Response schemas
export const KnowledgeResponseSchema = KnowledgeSchema.extend({
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const CompressKnowledgeResponseSchema = z.object({
  originalSize: z.number(),
  compressedSize: z.number(),
  compressionRatio: z.number(),
  content: z.string(),
  format: z.literal(KnowledgeFormatSchema.enum.compressed),
});

export const DecompressKnowledgeResponseSchema = z.object({
  compressedSize: z.number(),
  expandedSize: z.number(),
  expansionRatio: z.number(),
  content: z.string(),
  format: z.literal(KnowledgeFormatSchema.enum.standard),
});

// Export inferred types
export type Knowledge = z.infer<typeof KnowledgeSchema>;
export type KnowledgeResponse = z.infer<typeof KnowledgeResponseSchema>;
export type KnowledgeFormat = z.infer<typeof KnowledgeFormatSchema>;
export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;
export type KnowledgeAccessLevel = z.infer<typeof KnowledgeAccessLevelSchema>;

export type CompressKnowledgeRequest = z.infer<typeof CompressKnowledgeRequestSchema>;
export type DecompressKnowledgeRequest = z.infer<typeof DecompressKnowledgeRequestSchema>;
export type CreateKnowledgeRequest = z.infer<typeof CreateKnowledgeRequestSchema>;
export type GetKnowledgeRequest = z.infer<typeof GetKnowledgeRequestSchema>;
export type UpdateKnowledgeRequest = z.infer<typeof UpdateKnowledgeRequestSchema>;
export type ListKnowledgeRequest = z.infer<typeof ListKnowledgeRequestSchema>;
export type ShareKnowledgeRequest = z.infer<typeof ShareKnowledgeRequestSchema>;
export type TransferKnowledgeRequest = z.infer<typeof TransferKnowledgeRequestSchema>;

export type CompressKnowledgeResponse = z.infer<typeof CompressKnowledgeResponseSchema>;
export type DecompressKnowledgeResponse = z.infer<typeof DecompressKnowledgeResponseSchema>;
