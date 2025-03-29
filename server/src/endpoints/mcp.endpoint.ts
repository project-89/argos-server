import { Request, Response } from "express";
import { ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils";
import {
  CreateMCPProgramRequest,
  ExecuteMCPProgramRequest,
  GetMCPProgramRequest,
  UpdateMCPProgramRequest,
  GetMCPExecutionRequest,
  GetMCPTemplateRequest,
  MCPProgramStatus,
  MCPExecutionStatus,
  MCPAccessControl,
} from "../schemas/mcp.schema";
import {
  createMCPProgram,
  deleteMCPProgram,
  executeMCPProgram,
  getMCPExecution,
  getMCPProgram,
  getMCPTemplate,
  instantiateTemplate,
  listMCPExecutions,
  listMCPPrograms,
  listMCPTemplates,
  updateMCPProgram,
  deleteMCPExecution,
} from "../services/mcp.core.service";

const LOG_PREFIX = "[MCP Endpoint]";

// Define a type assertion helper function to access auth properties safely
function getUserId(req: Request): string {
  const userId =
    (req as unknown as { auth?: { agent?: { id: string }; account?: { id: string } } }).auth?.agent
      ?.id ||
    (req as unknown as { auth?: { agent?: { id: string }; account?: { id: string } } }).auth
      ?.account?.id;

  if (!userId) {
    throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
  }
  return userId;
}

// ====== Program Handlers ======

export async function handleCreateMCPProgram(
  req: Request<{}, {}, CreateMCPProgramRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Creating MCP program:`, { body: req.body });
    const userId = getUserId(req);

    // Ensure accessControl is properly defined (not undefined)
    const accessControl: MCPAccessControl = req.body.accessControl || { public: false };

    const program = await createMCPProgram(
      {
        name: req.body.name,
        description: req.body.description,
        code: req.body.code,
        configuration: req.body.configuration,
        templateId: req.body.templateId,
        accessControl,
        metadata: req.body.metadata || {},
        ownerId: userId, // This is required by the type but will be overridden by service
      },
      userId,
    );

    return res.status(201).json(program);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleUpdateMCPProgram(
  req: Request<UpdateMCPProgramRequest["params"], {}, UpdateMCPProgramRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Updating MCP program:`, { params: req.params, body: req.body });
    const userId = getUserId(req);
    const { programId } = req.params;
    const updatedProgram = await updateMCPProgram(programId, req.body, userId);

    return res.status(200).json(updatedProgram);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleGetMCPProgram(
  req: Request<GetMCPProgramRequest["params"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Getting MCP program:`, { params: req.params });
    const { programId } = req.params;
    const program = await getMCPProgram(programId);

    return res.status(200).json(program);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleListMCPPrograms(req: Request<{}, {}, {}, any>, res: Response) {
  try {
    console.log(`${LOG_PREFIX} Listing MCP programs:`, { query: req.query });
    const userId = getUserId(req);
    const { status, limit, offset } = req.query;

    const response = await listMCPPrograms(userId, {
      status: status as MCPProgramStatus,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP programs:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleDeleteMCPProgram(
  req: Request<GetMCPProgramRequest["params"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Deleting MCP program:`, { params: req.params });
    const userId = getUserId(req);
    const { programId } = req.params;

    const deleted = await deleteMCPProgram(programId, userId);

    if (deleted) {
      return res.status(204).send();
    } else {
      return res.status(404).json({ error: ERROR_MESSAGES.NOT_FOUND });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleExecuteMCPProgram(
  req: Request<ExecuteMCPProgramRequest["params"], {}, ExecuteMCPProgramRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Executing MCP program:`, { params: req.params, body: req.body });
    const userId = getUserId(req);
    const { programId } = req.params;
    const { inputs } = req.body;

    const execution = await executeMCPProgram(programId, inputs, userId);

    return res.status(202).json(execution);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error executing MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

// ====== Execution Handlers ======

export async function handleGetMCPExecution(
  req: Request<GetMCPExecutionRequest["params"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Getting MCP execution:`, { params: req.params });
    const { executionId } = req.params;
    const execution = await getMCPExecution(executionId);

    return res.status(200).json(execution);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP execution:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleListMCPExecutions(req: Request<{}, {}, {}, any>, res: Response) {
  try {
    console.log(`${LOG_PREFIX} Listing MCP executions:`, { query: req.query });
    const userId = getUserId(req);
    const { programId, status, limit, offset } = req.query;

    const response = await listMCPExecutions(userId, {
      programId,
      status: status as MCPExecutionStatus,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP executions:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleDeleteMCPExecution(
  req: Request<GetMCPExecutionRequest["params"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Deleting MCP execution:`, { params: req.params });
    const userId = getUserId(req);
    const { executionId } = req.params;

    const deleted = await deleteMCPExecution(executionId, userId);

    if (deleted) {
      return res.status(204).send();
    } else {
      return res.status(404).json({ error: ERROR_MESSAGES.NOT_FOUND });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting MCP execution:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

// ====== Template Handlers ======

export async function handleGetMCPTemplate(
  req: Request<GetMCPTemplateRequest["params"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Getting MCP template:`, { params: req.params });
    const { templateId } = req.params;
    const template = await getMCPTemplate(templateId);

    return res.status(200).json(template);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleListMCPTemplates(req: Request<{}, {}, {}, any>, res: Response) {
  try {
    console.log(`${LOG_PREFIX} Listing MCP templates:`, { query: req.query });
    const { category, limit, offset } = req.query;

    const response = await listMCPTemplates({
      category,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP templates:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function handleInstantiateMCPTemplate(
  req: Request<GetMCPTemplateRequest["params"], {}, CreateMCPProgramRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Instantiating MCP template:`, {
      params: req.params,
      body: req.body,
    });
    const userId = getUserId(req);
    const { templateId } = req.params;
    const { name, description, configuration, accessControl, metadata } = req.body;

    const program = await instantiateTemplate(
      templateId,
      { name, description, configuration, accessControl, metadata },
      userId,
    );

    return res.status(201).json(program);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error instantiating template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}
