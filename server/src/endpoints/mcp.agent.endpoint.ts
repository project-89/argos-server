import { Request, Response } from "express";
import { ApiError, sendSuccess, sendError } from "../utils";
import { ERROR_MESSAGES } from "../constants";
import { mcpRegisterAgent, mcpActivateAgent, mcpGetAgent } from "../services/mcp.agent.service";
import { AuthContext } from "../types/express";

const LOG_PREFIX = "[MCP Agent Endpoint]";

/**
 * Handle agent registration through MCP
 */
export async function handleMCPRegisterAgent(req: Request, res: Response) {
  try {
    console.log(`${LOG_PREFIX} Starting agent registration via MCP`);

    // Use the auth context for the user ID
    const userId = (req as any as { auth: AuthContext }).auth?.accountId;
    if (!userId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const agent = await mcpRegisterAgent(req.body);

    console.log(`${LOG_PREFIX} Successfully registered agent:`, { id: agent.id });
    return sendSuccess(res, agent, "Agent registered successfully via MCP", 201);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error registering agent:`, error);
    return sendError(res, ApiError.from(error, 400, ERROR_MESSAGES.FAILED_TO_CREATE_AGENT));
  }
}

/**
 * Handle agent activation through MCP
 */
export async function handleMCPActivateAgent(req: Request, res: Response) {
  try {
    console.log(`${LOG_PREFIX} Starting agent activation via MCP`);

    const { agentId } = req.params;
    const { walletAddress, signature, message } = req.body;

    // Validate required parameters
    if (!agentId) {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_INPUT);
    }

    if (!walletAddress || !signature || !message) {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_INPUT);
    }

    // Make sure agent exists before attempting activation
    await mcpGetAgent(agentId);

    const agent = await mcpActivateAgent(agentId, walletAddress, signature, message);

    console.log(`${LOG_PREFIX} Successfully activated agent:`, { id: agent.id });
    return sendSuccess(res, agent, "Agent activated successfully via MCP", 200);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error activating agent:`, error);
    return sendError(res, ApiError.from(error, 400, ERROR_MESSAGES.FAILED_TO_ACTIVATE_AGENT));
  }
}
