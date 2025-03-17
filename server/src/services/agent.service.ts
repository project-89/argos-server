import { AGENT_RANK, COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Agent, AgentState, RegisterAgentRequest } from "../schemas";
import { ApiError, verifySignature } from "../utils";
import { validateInvite, useInvite } from "./agentInvite.service";
import { createAccount, createProfile } from ".";

// Import MongoDB utilities instead of Firebase
import {
  getDb,
  toObjectId,
  formatDocument,
  formatDocuments,
  handleMongoError,
} from "../utils/mongodb";

const LOG_PREFIX = "[Agent Service]";

export async function registerAgent(request: RegisterAgentRequest["body"]): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Registering new agent:`, request.name);

    // Validate invite code first
    await validateInvite(request.inviteCode);

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

    // Mark invite as used
    await useInvite(request.inviteCode, agentId);

    console.log(`${LOG_PREFIX} Successfully registered agent:`, agentId);
    return { ...agent, id: agentId };
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
    const db = await getDb();
    const updatedIdentity = {
      ...agent.identity,
      walletAddress,
      isActivated: true,
      activatedAt: now,
    };

    const updatedState = {
      ...agent.state,
      status: "active" as const, // Using a const assertion to match the enum
    };

    await db.collection(COLLECTIONS.AGENTS).updateOne(
      { _id: toObjectId(agentId) },
      {
        $set: {
          identity: updatedIdentity,
          state: updatedState,
          updatedAt: now,
        },
      },
    );

    const updatedAgent: Agent = {
      ...agent,
      identity: updatedIdentity,
      state: updatedState,
      updatedAt: now,
    };

    return updatedAgent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error activating agent:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_ACTIVATE_AGENT);
  }
}

export async function getAgent(agentId: string): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Fetching agent:`, agentId);

    const db = await getDb();
    const agent = await db.collection(COLLECTIONS.AGENTS).findOne({ _id: toObjectId(agentId) });

    if (!agent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    return formatDocument<Agent>(agent);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching agent:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function updateAgentState(agentId: string, state: AgentState): Promise<Agent> {
  try {
    console.log(`${LOG_PREFIX} Updating agent state:`, agentId);

    const agent = await getAgent(agentId);
    const db = await getDb();
    const now = new Date();

    await db.collection(COLLECTIONS.AGENTS).updateOne(
      { _id: toObjectId(agentId) },
      {
        $set: {
          state,
          updatedAt: now,
        },
      },
    );

    const updatedAgent: Agent = {
      ...agent,
      state,
      updatedAt: now,
    };

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
    const db = await getDb();
    const now = new Date();

    const updatedFields = {
      ...updates,
      updatedAt: now,
    };

    await db
      .collection(COLLECTIONS.AGENTS)
      .updateOne({ _id: toObjectId(agentId) }, { $set: updatedFields });

    const updatedAgent: Agent = {
      ...agent,
      ...updates,
      updatedAt: now,
    };

    return updatedAgent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating agent:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function listAgents(limit: number = 10): Promise<Agent[]> {
  try {
    console.log(`${LOG_PREFIX} Listing agents`);

    const db = await getDb();
    const agents = await db.collection(COLLECTIONS.AGENTS).find({}).limit(limit).toArray();

    return formatDocuments<Agent>(agents);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing agents:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function getAgentsByCapability(capability: string): Promise<Agent[]> {
  try {
    console.log(`${LOG_PREFIX} Finding agents with capability:`, capability);

    const db = await getDb();
    const agents = await db
      .collection(COLLECTIONS.AGENTS)
      .find({ capabilities: { $elemMatch: { id: capability } } })
      .toArray();

    return formatDocuments<Agent>(agents);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error finding agents by capability:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}
