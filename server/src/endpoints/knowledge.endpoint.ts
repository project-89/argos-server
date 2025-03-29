import { Request, Response } from "express";
import { ApiError, sendError, sendSuccess } from "../utils";
import {
  CompressKnowledgeRequest,
  DecompressKnowledgeRequest,
  CreateKnowledgeRequest,
  GetKnowledgeRequest,
  UpdateKnowledgeRequest,
  ShareKnowledgeRequest,
  TransferKnowledgeRequest,
  KnowledgeStatus,
} from "../schemas/knowledge.schema";
import {
  compressKnowledge,
  decompressKnowledge,
  createKnowledge,
  getKnowledge,
  updateKnowledge,
  listKnowledge,
  shareKnowledge,
  transferKnowledge,
} from "../services/knowledge.service";
import { ERROR_MESSAGES, AGENT_RANK } from "../constants";

const LOG_PREFIX = "[Knowledge Endpoint]";

// Define a type assertion helper function to access auth properties safely
function getUserId(req: Request): string | undefined {
  return (
    (req as unknown as { auth?: { agent?: { id: string }; account?: { id: string } } }).auth?.agent
      ?.id ||
    (req as unknown as { auth?: { agent?: { id: string }; account?: { id: string } } }).auth
      ?.account?.id
  );
}

export async function handleCompressKnowledge(
  req: Request<{}, {}, CompressKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge compression:`, { body: req.body });
    const { content, domain } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await compressKnowledge(content, domain, userId);
    console.log(`${LOG_PREFIX} Knowledge compression successful`);
    sendSuccess(res, result, "Knowledge compressed successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error compressing knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}

export async function handleDecompressKnowledge(
  req: Request<{}, {}, DecompressKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge decompression:`, { body: req.body });
    const { content, domain } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await decompressKnowledge(content, domain, userId);
    console.log(`${LOG_PREFIX} Knowledge decompression successful`);
    sendSuccess(res, result, "Knowledge decompressed successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error decompressing knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}

export async function handleCreateKnowledge(
  req: Request<{}, {}, CreateKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge creation:`, { body: req.body });
    const ownerId = getUserId(req);

    if (!ownerId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    // Add the required fields that match the Knowledge schema
    const now = new Date();
    const knowledgeData = {
      ...req.body,
      ownerId,
      status: "active" as KnowledgeStatus,
      // Ensure requiredRank has a default value if not provided
      requiredRank: req.body.requiredRank || AGENT_RANK.initiate,
      // Ensure compressed has a default value if not provided
      compressed: req.body.compressed !== undefined ? req.body.compressed : false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Pass only the knowledge data object that matches the service signature
    const result = await createKnowledge(knowledgeData);
    console.log(`${LOG_PREFIX} Knowledge created successfully:`, { id: result.id });
    sendSuccess(res, result, "Knowledge created successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}

export async function handleGetKnowledge(
  req: Request<GetKnowledgeRequest["params"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge retrieval:`, { params: req.params });
    const { knowledgeId } = req.params;
    const requesterId = getUserId(req);

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await getKnowledge(knowledgeId, requesterId);
    console.log(`${LOG_PREFIX} Knowledge retrieved successfully:`, { id: knowledgeId });
    sendSuccess(res, result, "Knowledge retrieved successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error retrieving knowledge:`, error);
    sendError(res, ApiError.from(error, 404, ERROR_MESSAGES.NOT_FOUND));
  }
}

export async function handleUpdateKnowledge(
  req: Request<UpdateKnowledgeRequest["params"], {}, UpdateKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge update:`, { params: req.params, body: req.body });
    const { knowledgeId } = req.params;
    const requesterId = getUserId(req);

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await updateKnowledge(knowledgeId, req.body, requesterId);
    console.log(`${LOG_PREFIX} Knowledge updated successfully:`, { id: knowledgeId });
    sendSuccess(res, result, "Knowledge updated successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}

export async function handleListKnowledge(req: Request<{}, {}, {}, any>, res: Response) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge listing:`, { query: req.query });
    const requesterId = getUserId(req);

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    // Match the service function signature with correct parameters order
    const { domain, status, limit = 10, offset = 0 } = req.query;

    const result = await listKnowledge(
      requesterId,
      domain as any,
      status as any,
      Number(limit),
      Number(offset),
    );

    console.log(`${LOG_PREFIX} Knowledge listed successfully:`, {
      count: result.items?.length || 0,
    });
    sendSuccess(res, result, "Knowledge listed successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}

export async function handleShareKnowledge(
  req: Request<ShareKnowledgeRequest["params"], {}, ShareKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge sharing:`, {
      params: req.params,
      body: req.body,
    });
    const { knowledgeId } = req.params;
    const { targetAgentId, accessLevel, expiresAt } = req.body;
    const requesterId = getUserId(req);

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await shareKnowledge(
      knowledgeId,
      targetAgentId,
      accessLevel,
      requesterId,
      expiresAt,
    );

    console.log(`${LOG_PREFIX} Knowledge shared successfully:`, { id: knowledgeId, targetAgentId });
    sendSuccess(res, result, "Knowledge shared successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error sharing knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}

export async function handleTransferKnowledge(
  req: Request<{}, {}, TransferKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    console.log(`${LOG_PREFIX} Starting knowledge transfer:`, { body: req.body });
    const { knowledgeId, sourceAgentId, targetAgentId, transferMethod } = req.body;
    const requesterId = getUserId(req);

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await transferKnowledge(
      knowledgeId,
      sourceAgentId,
      targetAgentId,
      transferMethod,
      requesterId,
    );

    console.log(`${LOG_PREFIX} Knowledge transferred successfully:`, {
      id: knowledgeId,
      sourceAgentId,
      targetAgentId,
    });

    sendSuccess(res, result, "Knowledge transferred successfully");
  } catch (error) {
    console.error(`${LOG_PREFIX} Error transferring knowledge:`, error);
    sendError(res, ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR));
  }
}
