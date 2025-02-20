import { z } from "zod";
import { TimestampSchema, AccountIdSchema } from ".";

export const AgentInviteSchema = z.object({
  id: z.string(), // Unique invite code
  createdBy: AccountIdSchema, // Admin who created the invite
  usedBy: AccountIdSchema.optional(), // Agent that used this invite
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  usedAt: TimestampSchema.optional(),
  maxUses: z.number().default(1), // Default to single use
  useCount: z.number().default(0),
  isRevoked: z.boolean().default(false),
  metadata: z.record(z.any()).optional(), // Any additional constraints/metadata
});

// Request schemas
export const CreateInviteRequestSchema = z.object({
  body: z.object({
    expiresIn: z.number().optional(), // Expiry in seconds from now
    maxUses: z.number().optional(), // Override default single use
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const ValidateInviteRequestSchema = z.object({
  params: z.object({
    inviteCode: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

// Response schemas
export const AgentInviteResponseSchema = AgentInviteSchema.extend({
  createdAt: z.number(),
  expiresAt: z.number(),
  usedAt: z.number().optional(),
});

export const DeleteInviteRequestSchema = z.object({
  params: z.object({
    inviteCode: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

// Export inferred types
export type AgentInvite = z.infer<typeof AgentInviteSchema>;
export type AgentInviteResponse = z.infer<typeof AgentInviteResponseSchema>;
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;
export type ValidateInviteRequest = z.infer<typeof ValidateInviteRequestSchema>;
export type DeleteInviteRequest = z.infer<typeof DeleteInviteRequestSchema>;
