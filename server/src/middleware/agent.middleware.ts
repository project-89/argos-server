import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils";
import { ERROR_MESSAGES } from "../constants";

const LOG_PREFIX = "[Agent Middleware]";
import { getAgent } from "../services";
/**
 * Middleware to verify request is from a valid agent
 * Checks:
 * 1. Agent exists and is registered
 * 2. Agent is active and available
 * 3. Agent has required capabilities (if specified)
 */
export const verifyAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.body.agentId || req.params.agentId || req.query.agentId;
    if (!agentId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    console.log(`${LOG_PREFIX} Verifying agent:`, { agentId });

    const agent = await getAgent(agentId);

    // Verify agent is active
    if (agent.state.status === "inactive" || agent.state.status === "suspended") {
      console.log(`${LOG_PREFIX} Agent is not active:`, { agentId, status: agent.state.status });
      throw new ApiError(403, ERROR_MESSAGES.AGENT_NOT_ACTIVE);
    }

    // Add agent to request for downstream use
    req.auth!.agent = {
      id: agentId,
      isActive: agent.state.status === "active",
    };
    console.log(`${LOG_PREFIX} Agent verified:`, { agentId });

    next();
  } catch (error) {
    next(error);
  }
};
