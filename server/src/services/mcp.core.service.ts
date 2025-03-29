import { COLLECTIONS, ERROR_MESSAGES, AUTH_ERRORS } from "../constants";
import {
  MCPProgram,
  MCPExecution,
  MCPTemplate,
  MCPProgramStatus,
  MCPExecutionStatus,
  ListMCPProgramsResponse,
  ListMCPExecutionsResponse,
  ListMCPTemplatesResponse,
} from "../schemas/mcp.schema";
import { ApiError, idFilter } from "../utils";
import { getDb, formatDocument, formatDocuments, serverTimestamp } from "../utils/mongodb";
import { mcpGetAgent } from "./mcp.agent.service";

const LOG_PREFIX = "[MCP Service]";

// MCP Program Service

/**
 * Create a new MCP program
 */
export async function createMCPProgram(
  params: Omit<MCPProgram, "id" | "createdAt" | "updatedAt" | "version" | "status">,
  ownerId: string,
): Promise<MCPProgram> {
  try {
    console.log(`${LOG_PREFIX} Creating MCP program:`, params.name);
    const db = await getDb();

    const now = serverTimestamp();
    const program: Omit<MCPProgram, "id"> = {
      name: params.name,
      description: params.description,
      code: params.code,
      configuration: params.configuration,
      templateId: params.templateId,
      ownerId,
      accessControl: params.accessControl,
      metadata: params.metadata || {},
      version: "1.0.0",
      status: "active" as MCPProgramStatus,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.MCP_PROGRAMS).insertOne(program);

    return {
      ...program,
      id: result.insertedId.toString(),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Get an MCP program by ID
 */
export async function getMCPProgram(programId: string): Promise<MCPProgram> {
  try {
    console.log(`${LOG_PREFIX} Getting MCP program:`, { programId });
    const db = await getDb();

    const filter = idFilter(programId);
    const programDoc = await db.collection(COLLECTIONS.MCP_PROGRAMS).findOne(filter);

    if (!programDoc) {
      throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
    }

    return formatDocument<MCPProgram>(programDoc)!;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Update an MCP program
 */
export async function updateMCPProgram(
  programId: string,
  updates: Partial<MCPProgram>,
  requesterId: string,
): Promise<MCPProgram> {
  try {
    console.log(`${LOG_PREFIX} Updating MCP program:`, { programId });
    const db = await getDb();

    // Get existing program
    const program = await getMCPProgram(programId);

    // Check ownership
    if (program.ownerId !== requesterId) {
      throw new ApiError(403, AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }

    const filter = idFilter(programId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Remove id from updates if present
    if ("id" in updateData) {
      delete updateData.id;
    }

    // Increment version if code is changed
    if (updates.code) {
      const [major, minor, patch] = program.version.split(".").map(Number);
      updateData.version = `${major}.${minor}.${patch + 1}`;
    }

    await db.collection(COLLECTIONS.MCP_PROGRAMS).updateOne(filter, { $set: updateData });

    return {
      ...program,
      ...updateData,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * List MCP programs with filtering
 */
export async function listMCPPrograms(
  requesterId: string,
  options: {
    status?: MCPProgramStatus;
    ownerId?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ListMCPProgramsResponse> {
  try {
    console.log(`${LOG_PREFIX} Listing MCP programs:`, options);
    const db = await getDb();

    const { status, ownerId = requesterId, limit = 20, offset = 0 } = options;

    // Build query
    const query: Record<string, any> = { ownerId };
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await db.collection(COLLECTIONS.MCP_PROGRAMS).countDocuments(query);

    // Get programs
    const programDocs = await db
      .collection(COLLECTIONS.MCP_PROGRAMS)
      .find(query)
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      items: formatDocuments<MCPProgram>(programDocs),
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP programs:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Delete an MCP program
 */
export async function deleteMCPProgram(programId: string, requesterId: string): Promise<boolean> {
  try {
    console.log(`${LOG_PREFIX} Deleting MCP program:`, { programId });
    const db = await getDb();

    // Get existing program
    const program = await getMCPProgram(programId);

    // Check ownership
    if (program.ownerId !== requesterId) {
      throw new ApiError(403, AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }

    const filter = idFilter(programId);
    const result = await db.collection(COLLECTIONS.MCP_PROGRAMS).deleteOne(filter);

    return result.deletedCount > 0;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

// MCP Execution Service

/**
 * Execute an MCP program
 */
export async function executeMCPProgram(
  programId: string,
  inputs: Record<string, any>,
  executorId: string,
): Promise<MCPExecution> {
  try {
    console.log(`${LOG_PREFIX} Executing MCP program:`, { programId });
    const db = await getDb();

    // Get the program
    const program = await getMCPProgram(programId);

    // Check if the program is active
    if (program.status !== "active") {
      throw new ApiError(400, "Program is not active");
    }

    // Check access control permissions
    const accessControl = program.accessControl || { public: false };
    const hasAccess = await checkProgramAccessControl(accessControl, executorId, programId);

    if (!hasAccess) {
      throw new ApiError(403, "Access denied to execute this program");
    }

    // Create an execution record
    const now = serverTimestamp();
    const execution: Omit<MCPExecution, "id"> = {
      programId,
      executorId,
      status: "pending" as MCPExecutionStatus,
      inputs,
      outputs: {},
      logs: [],
      startedAt: now,
      metadata: {},
    };

    // Insert execution record
    const result = await db.collection(COLLECTIONS.MCP_EXECUTIONS).insertOne(execution);
    const executionId = result.insertedId.toString();

    // In a real system, this might dispatch to a message queue or worker
    // For now, execute synchronously for demo purposes
    setTimeout(() => {
      runExecution(executionId, program, inputs).catch((error) => {
        console.error(`${LOG_PREFIX} Error in execution:`, error);
      });
    }, 0);

    return {
      ...execution,
      id: executionId,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error executing MCP program:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Execute the program (simulated execution engine)
 */
async function runExecution(
  executionId: string,
  program: MCPProgram,
  inputs: Record<string, any>,
): Promise<void> {
  const db = await getDb();
  const filter = idFilter(executionId);

  try {
    // Update status to running
    await db.collection(COLLECTIONS.MCP_EXECUTIONS).updateOne(filter, {
      $set: { status: "running", updatedAt: serverTimestamp() },
    });

    // Mock execution - in a real system, this would execute the code
    console.log(`${LOG_PREFIX} Running execution ${executionId} for program ${program.id}`);

    // Add a mock log entry
    await db.collection(COLLECTIONS.MCP_EXECUTIONS).updateOne(filter, {
      $push: {
        logs: {
          timestamp: serverTimestamp(),
          level: "info",
          message: "Execution started",
        },
      },
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock successful execution result
    const outputs = {
      result: `Executed program: ${program.name}`,
      timestamp: new Date().toISOString(),
      inputSize: Object.keys(inputs).length,
    };

    // Update execution with successful completion
    await db.collection(COLLECTIONS.MCP_EXECUTIONS).updateOne(filter, {
      $set: {
        status: "completed",
        updatedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        outputs,
      },
      $push: {
        logs: {
          timestamp: serverTimestamp(),
          level: "info",
          message: "Execution completed successfully",
        },
      },
    });

    console.log(`${LOG_PREFIX} Execution ${executionId} completed successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in execution ${executionId}:`, error);

    // Update execution with failure
    await db.collection(COLLECTIONS.MCP_EXECUTIONS).updateOne(filter, {
      $set: {
        status: "failed",
        updatedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
      $push: {
        logs: {
          timestamp: serverTimestamp(),
          level: "error",
          message: "Execution failed",
          data: { error: error instanceof Error ? error.message : "Unknown error" },
        },
      },
    });
  }
}

/**
 * Get an MCP execution by ID
 */
export async function getMCPExecution(executionId: string): Promise<MCPExecution> {
  try {
    console.log(`${LOG_PREFIX} Getting MCP execution:`, { executionId });
    const db = await getDb();

    const filter = idFilter(executionId);
    const executionDoc = await db.collection(COLLECTIONS.MCP_EXECUTIONS).findOne(filter);

    if (!executionDoc) {
      throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
    }

    return formatDocument<MCPExecution>(executionDoc)!;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP execution:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * List MCP executions with filtering
 */
export async function listMCPExecutions(
  requesterId: string,
  options: {
    programId?: string;
    status?: MCPExecutionStatus;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ListMCPExecutionsResponse> {
  try {
    console.log(`${LOG_PREFIX} Listing MCP executions:`, options);
    const db = await getDb();

    const { programId, status, limit = 20, offset = 0 } = options;

    // Build query
    const query: Record<string, any> = { executorId: requesterId };
    if (programId) {
      query.programId = programId;
    }
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await db.collection(COLLECTIONS.MCP_EXECUTIONS).countDocuments(query);

    // Get executions
    const executionDocs = await db
      .collection(COLLECTIONS.MCP_EXECUTIONS)
      .find(query)
      .sort({ startedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      items: formatDocuments<MCPExecution>(executionDocs),
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP executions:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Delete an MCP execution record
 */
export async function deleteMCPExecution(
  executionId: string,
  requesterId: string,
): Promise<boolean> {
  try {
    console.log(`${LOG_PREFIX} Deleting MCP execution:`, { executionId });
    const db = await getDb();

    // Get existing execution
    const execution = await getMCPExecution(executionId);

    // Check ownership
    if (execution.executorId !== requesterId) {
      throw new ApiError(403, AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }

    const filter = idFilter(executionId);
    const result = await db.collection(COLLECTIONS.MCP_EXECUTIONS).deleteOne(filter);

    return result.deletedCount > 0;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting MCP execution:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

// MCP Template Service

/**
 * Get an MCP template by ID
 */
export async function getMCPTemplate(templateId: string): Promise<MCPTemplate> {
  try {
    console.log(`${LOG_PREFIX} Getting MCP template:`, { templateId });
    const db = await getDb();

    const filter = idFilter(templateId);
    const templateDoc = await db.collection(COLLECTIONS.MCP_TEMPLATES).findOne(filter);

    if (!templateDoc) {
      throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
    }

    return formatDocument<MCPTemplate>(templateDoc)!;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * List MCP templates with filtering
 */
export async function listMCPTemplates(
  options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ListMCPTemplatesResponse> {
  try {
    console.log(`${LOG_PREFIX} Listing MCP templates:`, options);
    const db = await getDb();

    const { category, limit = 20, offset = 0 } = options;

    // Build query
    const query: Record<string, any> = {};
    if (category) {
      query.category = category;
    }

    // Get total count
    const total = await db.collection(COLLECTIONS.MCP_TEMPLATES).countDocuments(query);

    // Get templates
    const templateDocs = await db
      .collection(COLLECTIONS.MCP_TEMPLATES)
      .find(query)
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      items: formatDocuments<MCPTemplate>(templateDocs),
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP templates:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Create program from template
 */
export async function instantiateTemplate(
  templateId: string,
  params: {
    name: string;
    description?: string;
    configuration: Record<string, any>;
    accessControl?: Partial<MCPProgram["accessControl"]>;
    metadata?: Record<string, any>;
  },
  ownerId: string,
): Promise<MCPProgram> {
  try {
    console.log(`${LOG_PREFIX} Instantiating MCP template:`, { templateId });
    const db = await getDb();

    // Get template
    const template = await getMCPTemplate(templateId);

    // Create program parameters
    const programParams: Omit<MCPProgram, "id" | "createdAt" | "updatedAt" | "version" | "status"> =
      {
        name: params.name,
        description: params.description || template.description,
        code: template.codeTemplate,
        configuration: params.configuration,
        templateId,
        ownerId,
        accessControl: {
          public: false,
          ...(params.accessControl || {}),
        },
        metadata: {
          ...(template.metadata || {}),
          ...(params.metadata || {}),
          templateSource: templateId,
        },
      };

    // Create the program
    return createMCPProgram(programParams, ownerId);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error instantiating MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Checks if a user has access to run a program based on access control settings
 */
async function checkProgramAccessControl(
  accessControl: MCPProgram["accessControl"],
  executorId: string,
  programId: string,
): Promise<boolean> {
  try {
    // If program is public, allow access
    if (accessControl.public) {
      return true;
    }

    // If executor is the owner, allow access
    const program = await getMCPProgram(programId);
    if (program.ownerId === executorId) {
      return true;
    }

    // Check if executor is in the allowedAgentIds list
    if (accessControl.allowedAgentIds && accessControl.allowedAgentIds.includes(executorId)) {
      return true;
    }

    // Check if executor has a required rank
    if (accessControl.allowedRanks && accessControl.allowedRanks.length > 0) {
      try {
        // Get executor's agent record to check rank
        const agent = await mcpGetAgent(executorId);

        if (agent && accessControl.allowedRanks.includes(agent.identity.rank)) {
          return true;
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Error checking agent rank:`, error);
        return false;
      }
    }

    // No access conditions were met
    return false;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error checking access control:`, error);
    return false;
  }
}
