import { COLLECTIONS, ERROR_MESSAGES, AGENT_RANK } from "../constants";
import {
  Knowledge,
  KnowledgeShare,
  KnowledgeTransfer,
  KnowledgeDomain,
  CompressKnowledgeResponse,
  DecompressKnowledgeResponse,
  ListKnowledgeResponse,
} from "../schemas/knowledge.schema";
import { ApiError, idFilter, stringIdFilter } from "../utils";
import { hasPermission } from "./role.service";
import { getAgent } from "./agent.service";

// Import MongoDB utilities
import {
  getDb,
  formatDocument,
  formatDocuments,
  serverTimestamp,
  processDocumentForMongoDB,
} from "../utils/mongodb";
import { createMongoQuery } from "../utils/mongo-query";
import { MongoIdFilter } from "../types/mongodb";
import { ObjectId } from "mongodb";

const LOG_PREFIX = "[Knowledge Service]";

/**
 * Compress knowledge content based on domain
 */
export async function compressKnowledge(
  content: string,
  domain: KnowledgeDomain,
  requesterId?: string,
): Promise<CompressKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Compressing knowledge for domain:`, domain);

    // For now, our compression is just a placeholder
    // In a real implementation, this would use different strategies based on domain
    const compressedContent = `Compressed: ${content.substring(0, 50)}...`;

    return {
      compressedContent,
      originalLength: content.length,
      compressedLength: compressedContent.length,
      compressionRatio: content.length / compressedContent.length,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error compressing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_COMPRESS_KNOWLEDGE);
  }
}

/**
 * Decompress knowledge content
 */
export async function decompressKnowledge(
  compressedContent: string,
  domain: KnowledgeDomain,
  requesterId?: string,
): Promise<DecompressKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Decompressing knowledge for domain:`, domain);

    // For now, decompression is just a placeholder
    // This would use different strategies based on domain in a real implementation
    const content = compressedContent.startsWith("Compressed: ")
      ? compressedContent.substring(12).replace(/\.\.\.$/, "")
      : compressedContent;

    return {
      content,
      decompressedLength: content.length,
      originalLength: compressedContent.length,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error decompressing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DECOMPRESS_KNOWLEDGE);
  }
}

/**
 * Create new knowledge
 */
export async function createKnowledge(
  params: Omit<Knowledge, "id" | "createdAt" | "updatedAt">,
): Promise<Knowledge> {
  try {
    console.log(`${LOG_PREFIX} Creating knowledge:`, params.title);

    const now = new Date();
    const db = await getDb();

    const knowledge: Omit<Knowledge, "id"> = {
      ...params,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.KNOWLEDGE).insertOne(knowledge);
    const knowledgeId = result.insertedId.toString();

    console.log(`${LOG_PREFIX} Successfully created knowledge:`, knowledgeId);
    return { id: knowledgeId, ...knowledge };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_KNOWLEDGE);
  }
}

/**
 * Get knowledge by ID
 */
export async function getKnowledge(knowledgeId: string, requesterId: string): Promise<Knowledge> {
  try {
    console.log(`${LOG_PREFIX} Getting knowledge by ID:`, knowledgeId);
    const db = await getDb();

    // Create filter using the ID utility
    const filter = idFilter(knowledgeId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    const knowledgeDoc = await db.collection(COLLECTIONS.KNOWLEDGE).findOne(filter);

    if (!knowledgeDoc) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    const formattedKnowledge = formatDocument<Knowledge>(knowledgeDoc);
    if (!formattedKnowledge) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    // Check permission to access this knowledge
    if (formattedKnowledge.ownerId !== requesterId) {
      // Check if user has required agent rank
      const agent = await getAgent(requesterId);

      // Check if knowledge needs certain agent rank
      if (agent && agent.identity.rank < formattedKnowledge.requiredRank) {
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_RANK);
      }

      // Check if knowledge is shared with this user
      const share = await getKnowledgeShare(knowledgeId, requesterId);
      if (!share && formattedKnowledge.ownerId !== requesterId) {
        throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
      }
    }

    return formattedKnowledge;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
  }
}

/**
 * Update knowledge by ID
 */
export async function updateKnowledge(
  knowledgeId: string,
  updates: Partial<Knowledge>,
  requesterId: string,
): Promise<Knowledge> {
  try {
    console.log(`${LOG_PREFIX} Updating knowledge:`, knowledgeId);
    const db = await getDb();

    // Verify knowledge exists and user has access
    const knowledge = await getKnowledge(knowledgeId, requesterId);

    // Additional permission check: only owner can update, or users with modify access
    if (knowledge.ownerId !== requesterId) {
      const share = await getKnowledgeShare(knowledgeId, requesterId);
      if (!share || share.accessLevel !== "modify") {
        throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
      }
    }

    // Create update document
    const now = new Date();
    const updateData = {
      ...updates,
      updatedAt: now,
    };

    // Create filter using the ID utility
    const filter = idFilter(knowledgeId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    // Update the document
    await db.collection(COLLECTIONS.KNOWLEDGE).updateOne(filter, { $set: updateData });

    // Return updated document
    return { ...knowledge, ...updateData };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_KNOWLEDGE);
  }
}

/**
 * List knowledge for a user
 */
export async function listKnowledge(
  requesterId: string,
  domain?: KnowledgeDomain,
  status?: string,
  limit: number = 20,
  offset: number = 0,
): Promise<ListKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Listing knowledge for user:`, requesterId);
    const db = await getDb();

    // Get all IDs this user has access to
    const accessibleIds = await getAccessibleKnowledgeIds(requesterId);

    // Build filter for knowledge query
    const filter: any = { $or: [{ ownerId: requesterId }] };

    // Add IDs from knowledge shares
    if (accessibleIds.length > 0) {
      filter.$or.push({ _id: { $in: accessibleIds.map((id) => new ObjectId(id)) } });
    }

    // Add domain filter if specified
    if (domain) {
      filter.domain = domain;
    }

    // Add status filter if specified
    if (status) {
      filter.status = status;
    }

    // Execute query with pagination
    const knowledgeCollection = db.collection(COLLECTIONS.KNOWLEDGE);
    const cursor = knowledgeCollection
      .find(filter)
      .skip(offset)
      .limit(limit)
      .sort({ updatedAt: -1 });

    // Get results
    const knowledgeItems = await formatDocuments<Knowledge>(await cursor.toArray());
    const total = await knowledgeCollection.countDocuments(filter);

    return {
      items: knowledgeItems,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Share knowledge with another agent
 */
export async function shareKnowledge(
  knowledgeId: string,
  targetAgentId: string,
  accessLevel: "read" | "modify",
  requesterId: string,
  expiresAt?: Date,
): Promise<KnowledgeShare> {
  try {
    console.log(`${LOG_PREFIX} Sharing knowledge:`, { knowledgeId, targetAgentId, requesterId });
    const db = await getDb();

    // Verify knowledge exists and user has access
    const knowledge = await getKnowledge(knowledgeId, requesterId);

    // Only knowledge owner can share
    if (knowledge.ownerId !== requesterId) {
      throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
    }

    // Create share document
    const now = new Date();
    const shareId = new Date().getTime().toString();

    const share: KnowledgeShare = {
      id: shareId,
      knowledgeId,
      agentId: targetAgentId,
      accessLevel,
      createdBy: requesterId,
      status: "active",
      expiresAt: expiresAt || null,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const result = await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).insertOne({
      ...share,
      _id: new ObjectId(shareId),
    });

    // Return created share
    return {
      id: shareId,
      ...share,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error sharing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_SHARE_KNOWLEDGE);
  }
}

/**
 * Get an active knowledge share
 */
async function getKnowledgeShare(
  knowledgeId: string,
  agentId: string,
): Promise<KnowledgeShare | null> {
  try {
    const db = await getDb();

    // Create filter for the share - both knowledgeId and agentId should be string IDs
    const shareFilter = {
      ...stringIdFilter("knowledgeId", knowledgeId),
      ...stringIdFilter("agentId", agentId),
    };

    const shareDoc = await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).findOne(shareFilter);

    if (!shareDoc) {
      return null;
    }

    return formatDocument<KnowledgeShare>(shareDoc);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting knowledge share:`, error);
    return null;
  }
}

/**
 * Transfer knowledge between agents
 */
export async function transferKnowledge(
  knowledgeId: string,
  sourceAgentId: string,
  targetAgentId: string,
  transferMethod: "copy" | "move",
  requesterId: string,
): Promise<KnowledgeTransfer> {
  try {
    console.log(`${LOG_PREFIX} Transferring knowledge:`, {
      knowledgeId,
      sourceAgentId,
      targetAgentId,
      transferMethod,
    });
    const db = await getDb();

    // Verify knowledge exists
    const filter = idFilter(knowledgeId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    const knowledgeDoc = await db.collection(COLLECTIONS.KNOWLEDGE).findOne(filter);
    if (!knowledgeDoc) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    const knowledge = formatDocument<Knowledge>(knowledgeDoc);
    if (!knowledge) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    // Create transfer document
    const now = new Date();
    const transferId = new Date().getTime().toString();

    const knowledgeTransfer: Omit<KnowledgeTransfer, "id"> = {
      knowledgeId,
      sourceAgentId,
      targetAgentId,
      transferMethod,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    // Save to database
    const objectIdTransfer = new ObjectId(transferId);
    if (!objectIdTransfer) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    await db.collection(COLLECTIONS.KNOWLEDGE_TRANSFERS).insertOne({
      ...knowledgeTransfer,
      _id: objectIdTransfer,
    });

    // Process transfer (in a real-world scenario, this might be asynchronous)
    if (transferMethod === "copy") {
      // Deep clone knowledge for the target agent
      const newKnowledge = { ...knowledge };
      delete (newKnowledge as any).id;
      newKnowledge.ownerId = targetAgentId;
      await createKnowledge(newKnowledge);
    } else if (transferMethod === "move") {
      // Update ownership to target agent
      const transferFilter = idFilter(transferId);
      if (!transferFilter) {
        throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
      }

      await db
        .collection(COLLECTIONS.KNOWLEDGE)
        .updateOne(filter, { $set: { ownerId: targetAgentId, updatedAt: now } });
    }

    // Mark transfer as completed
    const objectIdForTransfer = new ObjectId(transferId);
    if (!objectIdForTransfer) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    const transferFilter = { _id: objectIdForTransfer };
    await db.collection(COLLECTIONS.KNOWLEDGE_TRANSFERS).updateOne(transferFilter, {
      $set: { status: "completed", completedAt: now, updatedAt: now },
    });

    // Return created transfer
    return {
      id: transferId,
      ...knowledgeTransfer,
      status: "completed",
      completedAt: now,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error transferring knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_TRANSFER_KNOWLEDGE);
  }
}

/**
 * Get all knowledge IDs that a user has access to through shares
 */
async function getAccessibleKnowledgeIds(requesterId: string): Promise<string[]> {
  try {
    const db = await getDb();

    // Get all active shares for this user
    const shares = await db
      .collection(COLLECTIONS.KNOWLEDGE_SHARES)
      .find({
        targetAgentId: requesterId,
        status: "active",
      })
      .toArray();

    // Return knowledge IDs
    const accessibleKnowledgeIds = [];

    for (const share of shares) {
      accessibleKnowledgeIds.push(share.knowledgeId);
    }

    return accessibleKnowledgeIds;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting accessible knowledge IDs:`, error);
    return [];
  }
}
