import { Request, Response } from "express";
import { ApiError, sendError, sendSuccess } from "../utils";
import {
  CompressKnowledgeRequest,
  DecompressKnowledgeRequest,
  CreateKnowledgeRequest,
  GetKnowledgeRequest,
  UpdateKnowledgeRequest,
  ListKnowledgeRequest,
  ShareKnowledgeRequest,
  TransferKnowledgeRequest,
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
import { ERROR_MESSAGES } from "../constants";

export async function handleCompressKnowledge(
  req: Request<{}, {}, CompressKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    const { content, domain } = req.body;
    const result = await compressKnowledge(content, domain);
    sendSuccess(res, result, "Knowledge compressed successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_COMPRESS_KNOWLEDGE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleDecompressKnowledge(
  req: Request<{}, {}, DecompressKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    const { content, domain } = req.body;
    const result = await decompressKnowledge(content, domain);
    sendSuccess(res, result, "Knowledge decompressed successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DECOMPRESS_KNOWLEDGE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleCreateKnowledge(
  req: Request<{}, {}, CreateKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    // Get the authenticated user ID from the request
    const ownerId = (req as any).auth?.accountId;

    if (!ownerId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const knowledge = await createKnowledge(req.body, ownerId);
    sendSuccess(res, knowledge, "Knowledge created successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_KNOWLEDGE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleGetKnowledge(
  req: Request<GetKnowledgeRequest["params"]>,
  res: Response,
) {
  try {
    // Get the authenticated user ID from the request
    const requesterId = (req as any).auth?.accountId;

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const knowledge = await getKnowledge(req.params.knowledgeId, requesterId);
    sendSuccess(res, knowledge, "Knowledge retrieved successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleUpdateKnowledge(
  req: Request<UpdateKnowledgeRequest["params"], {}, UpdateKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    // Get the authenticated user ID from the request
    const requesterId = (req as any).auth?.accountId;

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const knowledge = await updateKnowledge(req.params.knowledgeId, req.body, requesterId);
    sendSuccess(res, knowledge, "Knowledge updated successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_KNOWLEDGE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleListKnowledge(
  req: Request<{}, {}, {}, ListKnowledgeRequest["query"]>,
  res: Response,
) {
  try {
    // Get the authenticated user ID from the request
    const requesterId = (req as any).auth?.accountId;

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const options = {
      domain: req.query.domain,
      format: req.query.format,
      accessLevel: req.query.accessLevel,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    const knowledgeItems = await listKnowledge(requesterId, options);
    sendSuccess(res, knowledgeItems, "Knowledge listed successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleShareKnowledge(
  req: Request<ShareKnowledgeRequest["params"], {}, ShareKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    // Get the authenticated user ID from the request
    const requesterId = (req as any).auth?.accountId;

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await shareKnowledge(
      req.params.knowledgeId,
      req.body.targetAgentId,
      requesterId,
      req.body.expiresAt,
    );

    sendSuccess(res, result, "Knowledge shared successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_SHARE_KNOWLEDGE);
    sendError(res, apiError, apiError.statusCode);
  }
}

export async function handleTransferKnowledge(
  req: Request<{}, {}, TransferKnowledgeRequest["body"]>,
  res: Response,
) {
  try {
    // Get the authenticated user ID from the request
    const requesterId = (req as any).auth?.accountId;

    if (!requesterId) {
      throw new ApiError(401, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const result = await transferKnowledge(
      req.body.sourceAgentId,
      req.body.targetAgentId,
      req.body.knowledgeIds,
      requesterId,
    );

    sendSuccess(res, result, "Knowledge transferred successfully");
  } catch (error) {
    const apiError = ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_TRANSFER_KNOWLEDGE);
    sendError(res, apiError, apiError.statusCode);
  }
}
