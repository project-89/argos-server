import { Router } from "express";

import {
  registerAgent,
  getAgent,
  updateAgent,
  updateAgentState,
  listAgents,
  getAgentsByCapability,
} from "../endpoints/agent.endpoints";

import {
  RegisterAgentRequestSchema,
  UpdateAgentRequestSchema,
  GetAgentRequestSchema,
  UpdateAgentStateRequestSchema,
} from "../schemas";

import {
  protectedEndpoint,
  validateRequest,
  agentEndpoint,
  adminEndpoint,
  publicEndpoint,
} from "../middleware";

const router = Router();

/**
 * Phase 1: Admin-only agent registration
 * Phase 2: Will allow verified users to register agents
 * Phase 3: Will allow open registration with verification
 */
router.post("/register", adminEndpoint(RegisterAgentRequestSchema), registerAgent);

/**
 * Public read access to agent directory
 * - Basic info available to all
 * - Detailed info available to authenticated users
 */
router.get("/:agentId", publicEndpoint(GetAgentRequestSchema), getAgent);

router.get("/", publicEndpoint(), listAgents);

router.get("/capability/:capability", publicEndpoint(), getAgentsByCapability);

/**
 * Agent self-management endpoints
 * Only the agent itself can update its state/info
 */
router.patch("/:agentId", agentEndpoint(UpdateAgentRequestSchema), updateAgent);

router.patch("/:agentId/state", agentEndpoint(UpdateAgentStateRequestSchema), updateAgentState);

export default router;
