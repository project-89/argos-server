import { z } from "zod";
import { AgentRankSchema } from "./role.schema";
import { ERROR_MESSAGES } from "../constants";
import { TimestampSchema } from "./common.schema";

// MCP Program Status Schema
export const MCPProgramStatusSchema = z.enum(["active", "inactive", "archived"]);

// MCP Execution Status Schema
export const MCPExecutionStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

// MCP Log Level Schema
export const MCPLogLevelSchema = z.enum(["info", "warning", "error"]);

// MCP Access Control Schema
export const MCPAccessControlSchema = z.object({
  public: z.boolean().default(false),
  allowedAgentIds: z.array(z.string()).optional(),
  allowedRanks: z.array(AgentRankSchema).optional(),
});

// MCP Log Entry Schema
export const MCPLogEntrySchema = z.object({
  timestamp: TimestampSchema,
  level: MCPLogLevelSchema,
  message: z.string(),
  data: z.record(z.any()).optional(),
});

// MCP Error Schema
export const MCPErrorSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  code: z.string().optional(),
});

// MCP Performance Schema
export const MCPPerformanceSchema = z.object({
  executionTimeMs: z.number(),
  memoryUsageKb: z.number().optional(),
});

// MCP Program Schema
export const MCPProgramSchema = z.object({
  id: z.string(),
  name: z.string().min(1, ERROR_MESSAGES.INVALID_INPUT),
  description: z.string().optional(),
  version: z.string(),
  status: MCPProgramStatusSchema,
  code: z.string(),
  configuration: z.record(z.any()),
  templateId: z.string().optional(),
  ownerId: z.string(),
  accessControl: MCPAccessControlSchema,
  metadata: z.record(z.any()).default({}),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// MCP Execution Schema
export const MCPExecutionSchema = z.object({
  id: z.string(),
  programId: z.string(),
  executorId: z.string(),
  status: MCPExecutionStatusSchema,
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  inputs: z.record(z.any()),
  outputs: z.record(z.any()).optional(),
  logs: z.array(MCPLogEntrySchema).default([]),
  error: MCPErrorSchema.optional(),
  performance: MCPPerformanceSchema.optional(),
  metadata: z.record(z.any()).default({}),
});

// MCP Template Schema
export const MCPTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, ERROR_MESSAGES.INVALID_INPUT),
  description: z.string(),
  category: z.string(),
  codeTemplate: z.string(),
  configurationSchema: z.record(z.any()),
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()),
  createdBy: z.string(),
  isSystem: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Request Schemas
export const CreateMCPProgramRequestSchema = z.object({
  body: z.object({
    name: z.string().min(1, ERROR_MESSAGES.INVALID_INPUT),
    description: z.string().optional(),
    code: z.string(),
    configuration: z.record(z.any()),
    templateId: z.string().optional(),
    accessControl: MCPAccessControlSchema.optional(),
    metadata: z.record(z.any()).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const UpdateMCPProgramRequestSchema = z.object({
  body: z.object({
    name: z.string().min(1, ERROR_MESSAGES.INVALID_INPUT).optional(),
    description: z.string().optional(),
    code: z.string().optional(),
    configuration: z.record(z.any()).optional(),
    status: MCPProgramStatusSchema.optional(),
    accessControl: MCPAccessControlSchema.optional(),
    metadata: z.record(z.any()).optional(),
  }),
  params: z.object({
    programId: z.string(),
  }),
  query: z.object({}).optional(),
});

export const ExecuteMCPProgramRequestSchema = z.object({
  body: z.object({
    inputs: z.record(z.any()),
  }),
  params: z.object({
    programId: z.string(),
  }),
  query: z.object({}).optional(),
});

export const GetMCPProgramRequestSchema = z.object({
  params: z.object({
    programId: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const ListMCPProgramsRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    limit: z.string().transform(Number).optional().default("20"),
    offset: z.string().transform(Number).optional().default("0"),
    status: MCPProgramStatusSchema.optional(),
    ownerId: z.string().optional(),
  }),
  body: z.object({}).optional(),
});

export const GetMCPExecutionRequestSchema = z.object({
  params: z.object({
    executionId: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const ListMCPExecutionsRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    limit: z.string().transform(Number).optional().default("20"),
    offset: z.string().transform(Number).optional().default("0"),
    programId: z.string().optional(),
    status: MCPExecutionStatusSchema.optional(),
    executorId: z.string().optional(),
  }),
  body: z.object({}).optional(),
});

export const GetMCPTemplateRequestSchema = z.object({
  params: z.object({
    templateId: z.string(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const ListMCPTemplatesRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    limit: z.string().transform(Number).optional().default("20"),
    offset: z.string().transform(Number).optional().default("0"),
    category: z.string().optional(),
  }),
  body: z.object({}).optional(),
});

export const InstantiateMCPTemplateRequestSchema = z.object({
  body: z.object({
    name: z.string().min(1, ERROR_MESSAGES.INVALID_INPUT),
    description: z.string().optional(),
    configuration: z.record(z.any()),
    accessControl: MCPAccessControlSchema.optional(),
    metadata: z.record(z.any()).optional(),
  }),
  params: z.object({
    templateId: z.string(),
  }),
  query: z.object({}).optional(),
});

// Response Schemas
export const MCPProgramResponseSchema = MCPProgramSchema;
export const MCPExecutionResponseSchema = MCPExecutionSchema;
export const MCPTemplateResponseSchema = MCPTemplateSchema;

export const ListMCPProgramsResponseSchema = z.object({
  items: z.array(MCPProgramResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const ListMCPExecutionsResponseSchema = z.object({
  items: z.array(MCPExecutionResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const ListMCPTemplatesResponseSchema = z.object({
  items: z.array(MCPTemplateResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// Type exports
export type MCPProgramStatus = z.infer<typeof MCPProgramStatusSchema>;
export type MCPExecutionStatus = z.infer<typeof MCPExecutionStatusSchema>;
export type MCPLogLevel = z.infer<typeof MCPLogLevelSchema>;
export type MCPAccessControl = z.infer<typeof MCPAccessControlSchema>;
export type MCPLogEntry = z.infer<typeof MCPLogEntrySchema>;
export type MCPError = z.infer<typeof MCPErrorSchema>;
export type MCPPerformance = z.infer<typeof MCPPerformanceSchema>;
export type MCPProgram = z.infer<typeof MCPProgramSchema>;
export type MCPExecution = z.infer<typeof MCPExecutionSchema>;
export type MCPTemplate = z.infer<typeof MCPTemplateSchema>;

// Request type exports
export type CreateMCPProgramRequest = z.infer<typeof CreateMCPProgramRequestSchema>;
export type UpdateMCPProgramRequest = z.infer<typeof UpdateMCPProgramRequestSchema>;
export type ExecuteMCPProgramRequest = z.infer<typeof ExecuteMCPProgramRequestSchema>;
export type GetMCPProgramRequest = z.infer<typeof GetMCPProgramRequestSchema>;
export type ListMCPProgramsRequest = z.infer<typeof ListMCPProgramsRequestSchema>;
export type GetMCPExecutionRequest = z.infer<typeof GetMCPExecutionRequestSchema>;
export type ListMCPExecutionsRequest = z.infer<typeof ListMCPExecutionsRequestSchema>;
export type GetMCPTemplateRequest = z.infer<typeof GetMCPTemplateRequestSchema>;
export type ListMCPTemplatesRequest = z.infer<typeof ListMCPTemplatesRequestSchema>;
export type InstantiateMCPTemplateRequest = z.infer<typeof InstantiateMCPTemplateRequestSchema>;

// Response type exports
export type MCPProgramResponse = z.infer<typeof MCPProgramResponseSchema>;
export type MCPExecutionResponse = z.infer<typeof MCPExecutionResponseSchema>;
export type MCPTemplateResponse = z.infer<typeof MCPTemplateResponseSchema>;
export type ListMCPProgramsResponse = z.infer<typeof ListMCPProgramsResponseSchema>;
export type ListMCPExecutionsResponse = z.infer<typeof ListMCPExecutionsResponseSchema>;
export type ListMCPTemplatesResponse = z.infer<typeof ListMCPTemplatesResponseSchema>;
