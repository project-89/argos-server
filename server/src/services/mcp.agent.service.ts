import { AGENT_RANK, COLLECTIONS, ERROR_MESSAGES, AUTH_ERRORS } from "../constants";
import { ApiError, idFilter, verifySignature } from "../utils";
import { getDb, serverTimestamp } from "../utils/mongodb";

import { getAgent, updateAgent, listAgents, getAgentsByCapability } from "./agent.service";
import { validateInvite, useInvite } from "./agentInvite.service";
import { createAccount, createProfile } from ".";

import { Agent, RegisterAgentRequest, AgentState } from "../schemas";

const LOG_PREFIX = "[MCP Agent Service]";

/**
 * MCP Service for handling agent registration and whitelisting
 */
export async function mcpRegisterAgent(request: RegisterAgentRequest["body"]): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Registering new agent via MCP:`, request.name);

    // Validate invite code first through MCP
    await mcpValidateInvite(request.inviteCode);

    const now = new Date();
    const db = await getDb();

    // Create agent document with proper typing
    const agent: Omit<Agent, "id"> = {
      name: request.name,
      description: request.description,
      version: request.version,
      source: request.source,
      capabilities: request.capabilities,
      identity: {
        isActivated: false,
        rank: AGENT_RANK.initiate,
      },
      state: {
        isAvailable: false,
        lastActiveAt: now,
        status: "pending", // using a valid status from the enum
        runtime: "offline",
        performance: {
          successRate: 0,
          completedMissions: 0,
          failedMissions: 0,
          averageResponseTime: 0,
          reputationScore: 0,
        },
      },
      connection: request.connection,
      missionHistory: {
        totalMissions: 0,
        completedMissions: 0,
        failedMissions: 0,
        activeMissionIds: [],
      },
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // Store agent document in MongoDB
    const result = await db.collection(COLLECTIONS.AGENTS).insertOne(agent);
    const agentId = result.insertedId.toString();

    // Mark invite as used through MCP
    await useInvite(request.inviteCode, agentId);

    // Log the registration in MCP executions for tracking
    await logMCPAgentRegistration(agentId, request.inviteCode);

    console.log(`${LOG_PREFIX} Successfully registered agent via MCP:`, agentId);
    return { ...agent, id: agentId };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error registering agent via MCP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_AGENT);
  }
}

/**
 * Activate an agent through MCP, binding it to a wallet address
 */
export async function mcpActivateAgent(
  agentId: string,
  walletAddress: string,
  signature: string,
  message: string,
): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Activating agent via MCP:`, agentId);

    // Verify wallet signature
    const isValidSignature = await verifySignature(signature, walletAddress, message);
    if (!isValidSignature) {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_SIGNATURE);
    }

    const agent = await mcpGetAgent(agentId);

    // Check if already activated
    if (agent.identity.isActivated) {
      throw new ApiError(400, ERROR_MESSAGES.AGENT_ALREADY_ACTIVATED);
    }

    const now = new Date();

    // Create agent profile and account after wallet verification
    await createProfile({
      fingerprintId: agentId,
      walletAddress,
      username: agent.name,
      bio: agent.description,
      avatarUrl: "",
      contactInfo: {},
      preferences: {},
    });

    // Call createAccount with separate parameters
    await createAccount(walletAddress, agentId, {
      message,
      signature,
      onboardingId: agentId,
    });

    // Update agent with activation details
    const db = await getDb();
    const updatedIdentity = {
      ...agent.identity,
      walletAddress,
      isActivated: true,
      activatedAt: now,
    };

    const updatedState = {
      ...agent.state,
      status: "active" as const,
    };

    // Create MongoDB filter using our utility
    const filter = idFilter(agentId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    // Update the agent in MongoDB
    await db.collection(COLLECTIONS.AGENTS).updateOne(filter, {
      $set: {
        identity: updatedIdentity,
        state: updatedState,
        updatedAt: now,
      },
    });

    // Log the activation in MCP executions
    await logMCPAgentActivation(agentId, walletAddress);

    console.log(`${LOG_PREFIX} Successfully activated agent via MCP:`, agentId);
    return {
      ...agent,
      identity: updatedIdentity,
      state: updatedState,
      updatedAt: now,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error activating agent via MCP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_ACTIVATE_AGENT);
  }
}

/**
 * Get agent details through MCP
 */
export async function mcpGetAgent(agentId: string): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Getting agent details via MCP:`, agentId);
    const agent = await getAgent(agentId);

    if (!agent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    return agent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting agent via MCP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

/**
 * Update agent state through MCP
 */
export async function mcpUpdateAgentState(
  agentId: string,
  state: Partial<AgentState>,
): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Updating agent state via MCP:`, { agentId, state });

    // Get current agent to merge with new state
    const agent = await getAgent(agentId);

    if (!agent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    // Update only the state properties that were provided
    const updatedAgent = await updateAgent(agentId, {
      state: {
        ...agent.state,
        ...state,
      },
    });

    // Log state update in MCP executions
    await logMCPAgentStateUpdate(agentId, state);

    return updatedAgent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating agent state via MCP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_AGENT);
  }
}

/**
 * Validate an invite code through MCP
 */
export async function mcpValidateInvite(inviteCode: string): Promise<boolean> {
  try {
    console.log(`${LOG_PREFIX} Validating invite code via MCP:`, inviteCode);
    const isValid = await validateInvite(inviteCode);

    if (!isValid) {
      throw new ApiError(400, "Invite code is invalid");
    }

    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error validating invite code via MCP:`, error);
    throw ApiError.from(error, 400, "Invite code is invalid");
  }
}

/**
 * Get agents by capability through MCP
 */
export async function mcpGetAgentsByCapability(capability: string): Promise<Agent[]> {
  try {
    console.log(`${LOG_PREFIX} Getting agents by capability via MCP:`, capability);
    const agents = await getAgentsByCapability(capability);
    return agents;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting agents by capability via MCP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * List agents through MCP
 */
export async function mcpListAgents(
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    rank?: string;
    isAvailable?: boolean;
  } = {},
): Promise<{ items: Agent[]; total: number; limit: number; offset: number }> {
  try {
    console.log(`${LOG_PREFIX} Listing agents via MCP:`, options);

    // Use default values if not provided
    const { limit = 10, offset = 0 } = options;

    // Get agents with filtering logic
    const agents = await listAgents(limit);

    // Apply filters based on options
    let filteredAgents = agents;

    if (options.status) {
      filteredAgents = filteredAgents.filter((agent) => agent.state.status === options.status);
    }

    if (options.isAvailable !== undefined) {
      filteredAgents = filteredAgents.filter(
        (agent) => agent.state.isAvailable === options.isAvailable,
      );
    }

    // Apply pagination
    const paginatedAgents = filteredAgents.slice(offset, offset + limit);

    return {
      items: paginatedAgents,
      total: filteredAgents.length,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing agents via MCP:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Log agent registration in MCP executions
 */
async function logMCPAgentRegistration(agentId: string, inviteCode: string): Promise<void> {
  try {
    const db = await getDb();
    const now = serverTimestamp();

    const log = {
      type: "agent_registration",
      agentId,
      details: {
        inviteCode,
        timestamp: now,
      },
      createdAt: now,
    };

    await db.collection(COLLECTIONS.MCP_EXECUTIONS).insertOne(log);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error logging agent registration:`, error);
    // Don't throw here - this is a non-critical operation
  }
}

/**
 * Log agent activation in MCP executions
 */
async function logMCPAgentActivation(agentId: string, walletAddress: string): Promise<void> {
  try {
    const db = await getDb();
    const now = serverTimestamp();

    const log = {
      type: "agent_activation",
      agentId,
      details: {
        walletAddress,
        timestamp: now,
      },
      createdAt: now,
    };

    await db.collection(COLLECTIONS.MCP_EXECUTIONS).insertOne(log);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error logging agent activation:`, error);
    // Don't throw here - this is a non-critical operation
  }
}

/**
 * Log agent state update in MCP executions
 */
async function logMCPAgentStateUpdate(agentId: string, state: Partial<AgentState>): Promise<void> {
  try {
    const db = await getDb();
    const now = serverTimestamp();

    const log = {
      type: "agent_state_update",
      agentId,
      details: {
        state,
        timestamp: now,
      },
      createdAt: now,
    };

    await db.collection(COLLECTIONS.MCP_EXECUTIONS).insertOne(log);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error logging agent state update:`, error);
    // Don't throw here - this is a non-critical operation
  }
}
