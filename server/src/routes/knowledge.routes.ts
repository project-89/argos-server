import { Router } from "express";

import {
  handleCompressKnowledge,
  handleDecompressKnowledge,
  handleCreateKnowledge,
  handleGetKnowledge,
  handleUpdateKnowledge,
  handleListKnowledge,
  handleShareKnowledge,
  handleTransferKnowledge,
} from "../endpoints/knowledge.endpoint";

import {
  CompressKnowledgeRequestSchema,
  DecompressKnowledgeRequestSchema,
  CreateKnowledgeRequestSchema,
  GetKnowledgeRequestSchema,
  UpdateKnowledgeRequestSchema,
  ListKnowledgeRequestSchema,
  ShareKnowledgeRequestSchema,
  TransferKnowledgeRequestSchema,
} from "../schemas/knowledge.schema";

import { protectedEndpoint, agentEndpoint, specialAccessEndpoint } from "../middleware";

const router = Router();

/**
 * Knowledge compression/decompression endpoints
 * - Available to all authenticated users
 */
router.post(
  "/knowledge/compress",
  agentEndpoint(CompressKnowledgeRequestSchema),
  handleCompressKnowledge,
);

router.post(
  "/knowledge/decompress",
  protectedEndpoint(DecompressKnowledgeRequestSchema),
  handleDecompressKnowledge,
);

/**
 * Knowledge CRUD endpoints
 * - Create/Update requires authentication
 * - Get/List respects access control based on knowledge settings
 */
router.post("/knowledge", agentEndpoint(CreateKnowledgeRequestSchema), handleCreateKnowledge);

router.get("/knowledge/:knowledgeId", agentEndpoint(GetKnowledgeRequestSchema), handleGetKnowledge);

router.patch(
  "/knowledge/:knowledgeId",
  agentEndpoint(UpdateKnowledgeRequestSchema),
  handleUpdateKnowledge,
);

router.get("/knowledge", agentEndpoint(ListKnowledgeRequestSchema), handleListKnowledge);

/**
 * Knowledge sharing endpoints
 * - Requires authentication
 * - Respects agent ranks and permissions
 */
router.post(
  "/knowledge/:knowledgeId/share",
  agentEndpoint(ShareKnowledgeRequestSchema),
  handleShareKnowledge,
);

/**
 * Knowledge transfer endpoints
 * - Requires special access (agent_creator role)
 * - Used for transferring knowledge between agents
 */
router.post(
  "/knowledge/transfer",
  agentEndpoint(TransferKnowledgeRequestSchema),
  handleTransferKnowledge,
);

export default router;
