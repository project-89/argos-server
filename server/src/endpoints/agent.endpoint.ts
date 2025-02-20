import { Request, Response } from "express";
import { ApiError, sendError, sendSuccess } from "../utils";
import {
  RegisterAgentRequest,
  UpdateAgentRequest,
  GetAgentRequest,
  UpdateAgentStateRequest,
} from "../schemas";
import {
  getAgent,
  listAgents,
  registerAgent,
  updateAgent,
  updateAgentState,
  getAgentsByCapability,
} from "../services";
import { ERROR_MESSAGES } from "../constants";

export async function handleRegisterAgent(
  req: Request<{}, {}, RegisterAgentRequest["body"]>,
  res: Response,
) {
  try {
    const agent = await registerAgent(req.body);
    sendSuccess(res, agent, "Agent registered successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_REGISTER_AGENT);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleGetAgent(req: Request<GetAgentRequest["params"]>, res: Response) {
  try {
    const agent = await getAgent(req.params.agentId);
    sendSuccess(res, agent, "Agent retrieved successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_AGENT);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleUpdateAgent(
  req: Request<UpdateAgentRequest["params"], {}, UpdateAgentRequest["body"]>,
  res: Response,
) {
  try {
    const agent = await updateAgent(req.params.agentId, req.body);
    sendSuccess(res, agent, "Agent updated successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_AGENT);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleUpdateAgentState(
  req: Request<UpdateAgentStateRequest["params"], {}, UpdateAgentStateRequest["body"]>,
  res: Response,
) {
  try {
    const agent = await updateAgentState(req.params.agentId, req.body);
    sendSuccess(res, agent, "Agent state updated successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_AGENT_STATE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleListAgents(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const agents = await listAgents(limit);
    sendSuccess(res, agents, "Agents listed successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_LIST_AGENTS);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleGetAgentsByCapability(
  req: Request<{ capability: string }>,
  res: Response,
) {
  try {
    const agents = await getAgentsByCapability(req.params.capability);
    sendSuccess(res, agents, "Agents retrieved successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_AGENTS_BY_CAPABILITY);
    sendError(res, apiError, apiError.statusCode);
  }
}
