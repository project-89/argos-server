import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Agent, AgentState, RegisterAgentRequest } from "../schemas";
import { ApiError } from "../utils";

import { createAccount, createProfile } from ".";

const LOG_PREFIX = "[Agent Service]";
const db = getFirestore();

export async function registerAgent(request: RegisterAgentRequest["body"]): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Registering new agent:`, request.name);

    // Create base account for the agent
    const accountId = generateId();
    const now = Timestamp.now();

    // Create agent document
    const agent: Agent = {
      id: accountId,
      name: request.name,
      description: request.description,
      version: request.version,
      source: request.source,
      capabilities: request.capabilities,
      state: {
        isAvailable: true,
        lastActiveAt: now,
        status: "idle",
        performance: {
          successRate: 0,
          completedMissions: 0,
          failedMissions: 0,
          averageResponseTime: 0,
          reputationScore: 0,
        },
      },
      identity: request.identity,
      integration: request.integration || {},
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // Create agent profile
    await createProfile({
      fingerprintId: accountId, // Using accountId as fingerprintId for agents
      username: request.name,
      bio: request.description,
      avatarUrl: "",
      contactInfo: {},
      preferences: {},
    });

    // Create agent account
    await createAccount({
      signature: "", // Agents might use different auth mechanism
      message: "",
      fingerprintId: accountId,
      onboardingId: accountId,
    });

    // Store agent document
    await db.collection(COLLECTIONS.AGENTS).doc(accountId).set(agent);

    console.log(`${LOG_PREFIX} Successfully registered agent:`, agent.id);
    return agent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error registering agent:`, error);
    throw ApiError.from(error);
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
    throw ApiError.from(error);
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
    throw ApiError.from(error);
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
    throw ApiError.from(error);
  }
}

export async function listAgents(limit: number = 10): Promise<Agent[]> {
  try {
    console.log(`${LOG_PREFIX} Listing agents`);

    const agentsSnapshot = await db.collection(COLLECTIONS.AGENTS).limit(limit).get();

    return agentsSnapshot.docs.map((doc) => doc.data() as Agent);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing agents:`, error);
    throw ApiError.from(error);
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
    throw ApiError.from(error);
  }
}
