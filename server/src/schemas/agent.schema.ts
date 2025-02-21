import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { AGENT_RANK } from "../constants";

import { AccountIdSchema, WalletAddressSchema, TimestampSchema } from ".";

// Agent-specific schemas
export const AgentSourceSchema = z.object({
  ecosystem: z.string(), // e.g., "zerebro", "pippin", "bully", "eliza", etc.
  type: z.string(), // e.g., "autonomous", "assisted", "hybrid"
  metadata: z.record(z.any()).optional(),
});

export const AgentConnectionSchema = z.object({
  type: z.enum(["api", "webhook", "rpc"]),
  endpoint: z.string().url(),
  authType: z.enum(["none", "apiKey", "oauth", "jwt"]),
  authData: z.record(z.any()).optional(),
});

export const AgentNFTSchema = z.object({
  contractAddress: z.string(),
  tokenId: z.string(),
  chain: z.string(),
  type: z.enum(["identity", "capability", "achievement", "other"]),
  metadata: z.record(z.any()).optional(),
});

export const AgentIdentitySchema = z.object({
  walletAddress: WalletAddressSchema.optional(), // Optional until activated
  nfts: z.array(AgentNFTSchema).optional(),
  publicKey: z.string().optional(),
  isActivated: z.boolean().default(false),
  activatedAt: TimestampSchema.optional(),
  rank: z.nativeEnum(AGENT_RANK).default(AGENT_RANK.initiate),
});

export const AgentIntegrationSchema = z.object({
  apiEndpoint: z.string().url().optional(), // For direct API calls if the agent exposes one
  webhookUrl: z.string().url().optional(), // For receiving updates/notifications
  authMethod: z.enum(["none", "apiKey", "oauth", "custom"]).optional(),
  authMetadata: z.record(z.any()).optional(),
});

export const AgentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  level: z.number().min(1).max(10),
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
  verifiedAt: TimestampSchema.optional(),
  missionTypes: z.array(z.string()).optional(), // Types of missions this agent can handle
  specializations: z.array(z.string()).optional(), // Specific areas of expertise
  constraints: z.array(z.string()).optional(), // Any limitations
  metadata: z.record(z.any()).optional(),
});

export const AgentStateSchema = z.object({
  isAvailable: z.boolean(),
  currentMissionId: z.string().optional(),
  lastActiveAt: TimestampSchema,
  status: z.enum(["pending", "active", "inactive", "suspended"]), // Added pending and suspended
  runtime: z.enum(["idle", "busy", "offline", "maintenance"]),
  performance: z
    .object({
      successRate: z.number(),
      completedMissions: z.number(),
      failedMissions: z.number(),
      averageResponseTime: z.number(),
      reputationScore: z.number(),
    })
    .optional(),
});

export const AgentMissionHistorySchema = z.object({
  totalMissions: z.number(),
  completedMissions: z.number(),
  failedMissions: z.number(),
  activeMissionIds: z.array(z.string()),
  missionHistory: z
    .array(
      z.object({
        missionId: z.string(),
        status: z.enum(["completed", "failed", "abandoned"]),
        performance: z.record(z.any()),
        timestamp: TimestampSchema,
      }),
    )
    .optional(),
});

// Base Agent Schema
export const AgentSchema = z.object({
  id: AccountIdSchema,
  identity: AgentIdentitySchema,
  name: z.string(),
  description: z.string(),
  version: z.string(),
  source: AgentSourceSchema,
  capabilities: z.array(AgentCapabilitySchema),
  state: AgentStateSchema,
  connection: AgentConnectionSchema,
  missionHistory: AgentMissionHistorySchema,
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Request validation schemas
export const RegisterAgentRequestSchema = z.object({
  body: z.object({
    inviteCode: z.string(), // Required invite code
    name: z.string().min(3),
    description: z.string(),
    version: z.string(),
    source: AgentSourceSchema,
    capabilities: z.array(AgentCapabilitySchema),
    connection: AgentConnectionSchema,
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const ActivateAgentRequestSchema = z.object({
  params: z.object({
    agentId: AccountIdSchema,
  }),
  body: z.object({
    walletAddress: WalletAddressSchema,
    signature: z.string(),
    message: z.string(),
  }),
  query: z.object({}).optional(),
});

export const UpdateAgentRequestSchema = z.object({
  params: z.object({
    agentId: AccountIdSchema,
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    version: z.string().optional(),
    capabilities: z.array(AgentCapabilitySchema).optional(),
    connection: AgentConnectionSchema.optional(),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
});

export const GetAgentRequestSchema = z.object({
  params: z.object({
    agentId: AccountIdSchema,
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const GetAgentsRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const GetAgentsByCapabilityRequestSchema = z.object({
  params: z.object({
    capability: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const UpdateAgentStateRequestSchema = z.object({
  params: z.object({
    agentId: AccountIdSchema,
  }),
  body: AgentStateSchema,
  query: z.object({}).optional(),
});

// Response schemas
export const AgentResponseSchema = AgentSchema.extend({
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Database types (what we get from Firestore)
export type AgentDocument = Omit<Agent, "id"> & {
  id?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// Public response schema (safe for public endpoints)
export const PublicAgentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  level: z.number(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
  missionTypes: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
});

export const PublicAgentStateSchema = z.object({
  isAvailable: z.boolean(),
  status: z.enum(["pending", "active", "inactive", "suspended"]),
  performance: z
    .object({
      successRate: z.number(),
      completedMissions: z.number(),
      reputationScore: z.number(),
    })
    .optional(),
});

export const PublicAgentResponseSchema = z.object({
  id: AccountIdSchema,
  name: z.string(),
  description: z.string(),
  version: z.string(),
  capabilities: z.array(PublicAgentCapabilitySchema),
  state: PublicAgentStateSchema,
  createdAt: z.number(),
});

// Helper function to convert AgentDocument to Agent
export function toAgent(doc: FirebaseFirestore.DocumentData, id: string): Agent {
  return {
    ...doc,
    id,
  } as Agent;
}

// Helper function to convert Agent to PublicAgentResponse
export function toPublicAgent(agent: Agent): PublicAgentResponse {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    version: agent.version,
    capabilities: agent.capabilities.map((cap) => ({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      category: cap.category,
      level: cap.level,
      verificationStatus: cap.verificationStatus,
      missionTypes: cap.missionTypes,
      specializations: cap.specializations,
    })),
    state: {
      isAvailable: agent.state.isAvailable,
      status: agent.state.status,
      performance: agent.state.performance
        ? {
            successRate: agent.state.performance.successRate,
            completedMissions: agent.state.performance.completedMissions,
            reputationScore: agent.state.performance.reputationScore,
          }
        : undefined,
    },
    createdAt: agent.createdAt.toMillis(),
  };
}

// Export inferred types
export type Agent = z.infer<typeof AgentSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
export type AgentSource = z.infer<typeof AgentSourceSchema>;
export type AgentNFT = z.infer<typeof AgentNFTSchema>;
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export type AgentIntegration = z.infer<typeof AgentIntegrationSchema>;
export type AgentMissionHistory = z.infer<typeof AgentMissionHistorySchema>;
export type RegisterAgentRequest = z.infer<typeof RegisterAgentRequestSchema>;
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;
export type GetAgentRequest = z.infer<typeof GetAgentRequestSchema>;
export type UpdateAgentStateRequest = z.infer<typeof UpdateAgentStateRequestSchema>;
export type PublicAgentResponse = z.infer<typeof PublicAgentResponseSchema>;
