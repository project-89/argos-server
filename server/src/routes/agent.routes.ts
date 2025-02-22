import { Router } from "express";

import {
  handleRegisterAgent,
  handleGetAgent,
  handleUpdateAgent,
  handleUpdateAgentState,
  handleListAgents,
  handleGetAgentsByCapability,
} from "../endpoints";

import {
  RegisterAgentRequestSchema,
  UpdateAgentRequestSchema,
  GetAgentRequestSchema,
  UpdateAgentStateRequestSchema,
  GetAgentsRequestSchema,
  GetAgentsByCapabilityRequestSchema,
} from "../schemas";

import { agentEndpoint, specialAccessEndpoint } from "../middleware";

const router = Router();

/**
 * Phase 1: Admin-only agent registration
 * Phase 2: Will allow verified users to register agents
 * Phase 3: Will allow open registration with verification
 */
router.post(
  "/agents/register",
  specialAccessEndpoint(RegisterAgentRequestSchema),
  handleRegisterAgent,
);

/**
 * Public read access to agent directory
 * - Basic info available to all
 * - Detailed info available to authenticated users
 */
router.get("/agents/:agentId", agentEndpoint(GetAgentRequestSchema), handleGetAgent);

router.get("/agents", agentEndpoint(GetAgentsRequestSchema), handleListAgents);

router.get(
  "/agents/capability/:capability",
  agentEndpoint(GetAgentsByCapabilityRequestSchema),
  handleGetAgentsByCapability,
);

/**
 * Agent self-management endpoints
 * Only the agent itself can update its state/info
 */
router.patch("/agents/:agentId", agentEndpoint(UpdateAgentRequestSchema), handleUpdateAgent);

router.patch(
  "/agents/:agentId/state",
  agentEndpoint(UpdateAgentStateRequestSchema),
  handleUpdateAgentState,
);

export default router;
