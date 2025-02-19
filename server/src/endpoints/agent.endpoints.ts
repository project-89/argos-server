import { Request, Response } from "express";
import { ApiError } from "../utils/errors";
import {
  RegisterAgentRequest,
  UpdateAgentRequest,
  GetAgentRequest,
  UpdateAgentStateRequest,
} from "../schemas/agent.schema";
import {
  registerAgent as registerAgentService,
  getAgent as getAgentService,
  updateAgent as updateAgentService,
  updateAgentState as updateAgentStateService,
  listAgents as listAgentsService,
  getAgentsByCapability as getAgentsByCapabilityService,
} from "../services/agent.service";

export async function registerAgent(
  req: Request<{}, {}, RegisterAgentRequest["body"]>,
  res: Response,
) {
  try {
    const agent = await registerAgentService(req.body);
    res.status(201).json(agent);
  } catch (error) {
    const apiError = ApiError.from(error);
    res.status(apiError.statusCode).json({ error: apiError.message });
  }
}

export async function getAgent(req: Request<GetAgentRequest["params"]>, res: Response) {
  try {
    const agent = await getAgentService(req.params.agentId);
    res.status(200).json(agent);
  } catch (error) {
    const apiError = ApiError.from(error);
    res.status(apiError.statusCode).json({ error: apiError.message });
  }
}

export async function updateAgent(
  req: Request<UpdateAgentRequest["params"], {}, UpdateAgentRequest["body"]>,
  res: Response,
) {
  try {
    const agent = await updateAgentService(req.params.agentId, req.body);
    res.status(200).json(agent);
  } catch (error) {
    const apiError = ApiError.from(error);
    res.status(apiError.statusCode).json({ error: apiError.message });
  }
}

export async function updateAgentState(
  req: Request<UpdateAgentStateRequest["params"], {}, UpdateAgentStateRequest["body"]>,
  res: Response,
) {
  try {
    const agent = await updateAgentStateService(req.params.agentId, req.body);
    res.status(200).json(agent);
  } catch (error) {
    const apiError = ApiError.from(error);
    res.status(apiError.statusCode).json({ error: apiError.message });
  }
}

export async function listAgents(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const agents = await listAgentsService(limit);
    res.status(200).json(agents);
  } catch (error) {
    const apiError = ApiError.from(error);
    res.status(apiError.statusCode).json({ error: apiError.message });
  }
}

export async function getAgentsByCapability(req: Request<{ capability: string }>, res: Response) {
  try {
    const agents = await getAgentsByCapabilityService(req.params.capability);
    res.status(200).json(agents);
  } catch (error) {
    const apiError = ApiError.from(error);
    res.status(apiError.statusCode).json({ error: apiError.message });
  }
}
