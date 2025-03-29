import { Router } from "express";
import { validateRequest } from "../middleware/validation.middleware";
import { protectedEndpoint, specialAccessEndpoint } from "../middleware/chains.middleware";
import {
  CreateMCPProgramRequestSchema,
  ExecuteMCPProgramRequestSchema,
  GetMCPProgramRequestSchema,
  ListMCPProgramsRequestSchema,
  UpdateMCPProgramRequestSchema,
  GetMCPExecutionRequestSchema,
  ListMCPExecutionsRequestSchema,
  GetMCPTemplateRequestSchema,
  ListMCPTemplatesRequestSchema,
} from "../schemas/mcp.schema";
import {
  handleCreateMCPProgram,
  handleDeleteMCPExecution,
  handleDeleteMCPProgram,
  handleExecuteMCPProgram,
  handleGetMCPExecution,
  handleGetMCPProgram,
  handleGetMCPTemplate,
  handleInstantiateMCPTemplate,
  handleListMCPExecutions,
  handleListMCPPrograms,
  handleListMCPTemplates,
  handleUpdateMCPProgram,
} from "../endpoints/mcp.endpoint";

import { RegisterAgentRequestSchema } from "../schemas/agent.schema";
import { handleMCPRegisterAgent, handleMCPActivateAgent } from "../endpoints/mcp.agent.endpoint";

const router = Router();

// Program routes
router.post(
  "/programs",
  protectedEndpoint,
  validateRequest(CreateMCPProgramRequestSchema),
  handleCreateMCPProgram,
);

router.get(
  "/programs/:programId",
  protectedEndpoint,
  validateRequest(GetMCPProgramRequestSchema),
  handleGetMCPProgram,
);

router.put(
  "/programs/:programId",
  protectedEndpoint,
  validateRequest(UpdateMCPProgramRequestSchema),
  handleUpdateMCPProgram,
);

router.delete(
  "/programs/:programId",
  protectedEndpoint,
  validateRequest(GetMCPProgramRequestSchema),
  handleDeleteMCPProgram,
);

router.get(
  "/programs",
  protectedEndpoint,
  validateRequest(ListMCPProgramsRequestSchema),
  handleListMCPPrograms,
);

router.post(
  "/programs/:programId/execute",
  protectedEndpoint,
  validateRequest(ExecuteMCPProgramRequestSchema),
  handleExecuteMCPProgram,
);

// Execution routes
router.get(
  "/executions/:executionId",
  protectedEndpoint,
  validateRequest(GetMCPExecutionRequestSchema),
  handleGetMCPExecution,
);

router.get(
  "/executions",
  protectedEndpoint,
  validateRequest(ListMCPExecutionsRequestSchema),
  handleListMCPExecutions,
);

router.delete(
  "/executions/:executionId",
  protectedEndpoint,
  validateRequest(GetMCPExecutionRequestSchema),
  handleDeleteMCPExecution,
);

// Template routes
router.get(
  "/templates/:templateId",
  protectedEndpoint,
  validateRequest(GetMCPTemplateRequestSchema),
  handleGetMCPTemplate,
);

router.get(
  "/templates",
  protectedEndpoint,
  validateRequest(ListMCPTemplatesRequestSchema),
  handleListMCPTemplates,
);

router.post(
  "/templates/:templateId/instantiate",
  protectedEndpoint,
  validateRequest(CreateMCPProgramRequestSchema),
  handleInstantiateMCPTemplate,
);

// Agent management via MCP routes
router.post(
  "/agents/register",
  specialAccessEndpoint(RegisterAgentRequestSchema),
  handleMCPRegisterAgent,
);

router.post("/agents/:agentId/activate", specialAccessEndpoint(), handleMCPActivateAgent);

export default router;
