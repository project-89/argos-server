import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { AGENT_RANK, COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Agent, AgentState, RegisterAgentRequest } from "../schemas";
import { ApiError, verifySignature } from "../utils";
import { validateInvite, useInvite } from "./agentInvite.service";

import { createAccount, createProfile } from ".";

const LOG_PREFIX = "[Agent Service]";
const db = getFirestore();

export async function registerAgent(request: RegisterAgentRequest["body"]): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Registering new agent:`, request.name);

    // Validate invite code first
    await validateInvite(request.inviteCode);

    const now = Timestamp.now();
    const agentRef = db.collection(COLLECTIONS.AGENTS).doc();

    const agent: Agent = {
      id: agentRef.id,
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
        status: "pending",
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

    // Store agent document
    await agentRef.set(agent);

    // Mark invite as used
    await useInvite(request.inviteCode, agent.id);

    console.log(`${LOG_PREFIX} Successfully registered agent:`, agent.id);
    return agent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error registering agent:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_AGENT);
  }
}

export async function activateAgent(
  agentId: string,
  walletAddress: string,
  signature: string,
  message: string,
): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Activating agent:`, agentId);

    // Verify wallet signature
    const isValidSignature = await verifySignature(signature, walletAddress, message);
    if (!isValidSignature) {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_SIGNATURE);
    }

    const agent = await getAgent(agentId);

    // Check if already activated
    if (agent.identity.isActivated) {
      throw new ApiError(400, ERROR_MESSAGES.AGENT_ALREADY_ACTIVATED);
    }

    const now = Timestamp.now();

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

    await createAccount({
      body: {
        walletAddress,
        fingerprintId: agentId,
        message,
        signature,
        onboardingId: agentId,
      },
    });

    // Update agent with activation details
    const updatedAgent: Agent = {
      ...agent,
      identity: {
        ...agent.identity,
        walletAddress,
        isActivated: true,
        activatedAt: now,
      },
      state: {
        ...agent.state,
        status: "active",
      },
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.AGENTS).doc(agentId).update({
      identity: updatedAgent.identity,
      state: updatedAgent.state,
      updatedAt: now,
    });

    return updatedAgent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error activating agent:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_ACTIVATE_AGENT);
  }
}

export async function getAgent(agentId: string): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Fetching agent:`, agentId);

    const agentDoc = await db.collection(COLLECTIONS.AGENTS).doc(agentId).get();

    if (!agentDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    return agentDoc.data() as Agent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching agent:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function updateAgentState(agentId: string, state: AgentState): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Updating agent state:`, agentId);

    const agent = await getAgent(agentId);

    const updatedAgent: Agent = {
      ...agent,
      state,
      updatedAt: Timestamp.now(),
    };

    await db.collection(COLLECTIONS.AGENTS).doc(agentId).update({
      state,
      updatedAt: Timestamp.now(),
    });

    return updatedAgent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating agent state:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Updating agent:`, agentId);

    const agent = await getAgent(agentId);

    const updatedAgent: Agent = {
      ...agent,
      ...updates,
      updatedAt: Timestamp.now(),
    };

    await db
      .collection(COLLECTIONS.AGENTS)
      .doc(agentId)
      .update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

    return updatedAgent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating agent:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function listAgents(limit: number = 10): Promise<Agent[]> {
  try {
    console.log(`${LOG_PREFIX} Listing agents`);

    const agentsSnapshot = await db.collection(COLLECTIONS.AGENTS).limit(limit).get();

    return agentsSnapshot.docs.map((doc) => doc.data() as Agent);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing agents:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function getAgentsByCapability(capability: string): Promise<Agent[]> {
  try {
    console.log(`${LOG_PREFIX} Finding agents with capability:`, capability);

    const agentsSnapshot = await db
      .collection(COLLECTIONS.AGENTS)
      .where("capabilities", "array-contains", capability)
      .get();

    return agentsSnapshot.docs.map((doc) => doc.data() as Agent);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error finding agents by capability:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}
