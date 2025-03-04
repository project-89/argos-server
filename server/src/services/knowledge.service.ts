import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES, AGENT_RANK_HIERARCHY } from "../constants";
import {
  Knowledge,
  KnowledgeResponse,
  CreateKnowledgeRequest,
  CompressKnowledgeResponse,
  DecompressKnowledgeResponse,
} from "../schemas";
import { ApiError } from "../utils";
import { getAgent } from "./agent.service";
import { getAccountById } from "./account.service";
import type FirebaseFirestore from "@google-cloud/firestore";

const LOG_PREFIX = "[Knowledge Service]";
const db = getFirestore();

/**
 * Knowledge compression and decompression
 */
export async function compressKnowledge(
  content: string,
  domain: string = "general",
): Promise<CompressKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Compressing knowledge in domain:`, domain);

    // This is a placeholder implementation
    // In a real implementation, this would use a more sophisticated algorithm
    // or call an external service/LLM for compression
    const originalSize = content.length;

    // Simple compression algorithm for demonstration
    // In production, this would be replaced with actual knowledge compression logic
    const compressedContent = `[COMPRESSED:${domain}]${content.substring(0, 100)}...${
      content.length
    } chars total`;
    const compressedSize = compressedContent.length;

    return {
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      content: compressedContent,
      format: "compressed",
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error compressing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function decompressKnowledge(
  content: string,
  domain: string = "general",
): Promise<DecompressKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Decompressing knowledge in domain:`, domain);

    // This is a placeholder implementation
    // In a real implementation, this would use a more sophisticated algorithm
    // or call an external service/LLM for decompression
    const compressedSize = content.length;

    // Simple decompression algorithm for demonstration
    // In production, this would be replaced with actual knowledge decompression logic
    const match = content.match(/\[COMPRESSED:(\w+)\](.*?)\.\.\.(\d+) chars total/);
    let expandedContent = content;
    let expandedSize = content.length;

    if (match) {
      // This is just a placeholder to simulate decompression
      expandedContent = `${match[2]}${"Lorem ipsum ".repeat(20)}... (Decompressed from ${
        match[3]
      } characters)`;
      expandedSize = parseInt(match[3], 10);
    }

    return {
      compressedSize,
      expandedSize,
      expansionRatio: expandedSize / compressedSize,
      content: expandedContent,
      format: "standard",
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error decompressing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Knowledge CRUD operations
 */
export async function createKnowledge(
  request: CreateKnowledgeRequest["body"],
  ownerId: string,
): Promise<KnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Creating knowledge:`, request.title);

    const now = Timestamp.now();
    const knowledgeRef = db.collection(COLLECTIONS.KNOWLEDGE).doc();

    const knowledge: Omit<Knowledge, "id"> = {
      title: request.title,
      description: request.description,
      content: request.content,
      format: request.format,
      domain: request.domain,
      accessLevel: request.accessLevel,
      ownerId,
      metadata: request.metadata || {},
      tags: request.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await knowledgeRef.set(knowledge);

    return formatKnowledgeResponse({
      id: knowledgeRef.id,
      ...knowledge,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function getKnowledge(
  knowledgeId: string,
  requesterId: string,
): Promise<KnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Fetching knowledge:`, knowledgeId);

    const knowledgeDoc = await db.collection(COLLECTIONS.KNOWLEDGE).doc(knowledgeId).get();

    if (!knowledgeDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
    }

    const knowledge = {
      id: knowledgeDoc.id,
      ...knowledgeDoc.data(),
    } as Knowledge;

    // Check access permissions
    await checkKnowledgeAccess(knowledge, requesterId);

    return formatKnowledgeResponse(knowledge);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function updateKnowledge(
  knowledgeId: string,
  updates: Partial<Knowledge>,
  requesterId: string,
): Promise<KnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Updating knowledge:`, knowledgeId);

    const knowledge = await getKnowledgeById(knowledgeId);

    // Check ownership
    if (knowledge.ownerId !== requesterId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    const now = Timestamp.now();
    const updateData = {
      ...updates,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.KNOWLEDGE).doc(knowledgeId).update(updateData);

    return formatKnowledgeResponse({
      ...knowledge,
      ...updateData,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function listKnowledge(
  requesterId: string,
  options: {
    domain?: string;
    format?: string;
    accessLevel?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<KnowledgeResponse[]> {
  try {
    console.log(`${LOG_PREFIX} Listing knowledge`);

    const { domain, format, accessLevel, limit = 10, offset = 0 } = options;

    let query = db.collection(
      COLLECTIONS.KNOWLEDGE,
    ) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    // Apply filters if provided
    if (domain) {
      query = query.where("domain", "==", domain);
    }

    if (format) {
      query = query.where("format", "==", format);
    }

    // For access level, we need to handle permissions
    if (accessLevel === "public") {
      query = query.where("accessLevel", "==", "public");
    } else {
      // For non-public knowledge, we need to check ownership or explicit sharing
      query = query
        .where("accessLevel", "in", ["public", "restricted"])
        .orderBy("createdAt", "desc");
    }

    const snapshot = await query.limit(limit).offset(offset).get();

    const knowledgeItems = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const knowledge = { id: doc.id, ...doc.data() } as Knowledge;

        // Check if user has access to this knowledge
        try {
          await checkKnowledgeAccess(knowledge, requesterId);
          return formatKnowledgeResponse(knowledge);
        } catch (error) {
          // Skip items the user doesn't have access to
          return null;
        }
      }),
    );

    // Filter out null values (items user doesn't have access to)
    return knowledgeItems.filter(Boolean) as KnowledgeResponse[];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function shareKnowledge(
  knowledgeId: string,
  targetAgentId: string,
  requesterId: string,
  expiresAt?: Timestamp,
): Promise<{ success: boolean }> {
  try {
    console.log(`${LOG_PREFIX} Sharing knowledge:`, knowledgeId, "with agent:", targetAgentId);

    const knowledge = await getKnowledgeById(knowledgeId);

    // Check ownership
    if (knowledge.ownerId !== requesterId) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Check if target agent exists
    const targetAgent = await getAgent(targetAgentId);
    if (!targetAgent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    const now = Timestamp.now();

    // Create a share record
    await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).add({
      knowledgeId,
      sourceAgentId: requesterId,
      targetAgentId,
      createdAt: now,
      expiresAt: expiresAt || null,
      status: "active",
    });

    return { success: true };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error sharing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function transferKnowledge(
  sourceAgentId: string,
  targetAgentId: string,
  knowledgeIds: string[],
  requesterId: string,
): Promise<{ success: boolean; transferredCount: number }> {
  try {
    console.log(`${LOG_PREFIX} Transferring knowledge from:`, sourceAgentId, "to:", targetAgentId);

    // Check if requester has permission to initiate transfer
    // This could be the source agent itself or an admin
    if (requesterId !== sourceAgentId) {
      const requesterAccount = await getAccountById(requesterId);
      if (!requesterAccount || !requesterAccount.roles.includes("admin")) {
        throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
      }
    }

    // Check if both agents exist
    const sourceAgent = await getAgent(sourceAgentId);
    const targetAgent = await getAgent(targetAgentId);

    if (!sourceAgent || !targetAgent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    // Check agent ranks for compatibility
    const sourceRank = sourceAgent.identity.rank;
    const targetRank = targetAgent.identity.rank;

    const sourceRankLevel = AGENT_RANK_HIERARCHY[sourceRank] || 0;
    const targetRankLevel = AGENT_RANK_HIERARCHY[targetRank] || 0;

    // Target agent must be of equal or higher rank to receive knowledge
    if (targetRankLevel < sourceRankLevel) {
      throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_RANK);
    }

    let transferredCount = 0;
    const now = Timestamp.now();

    // Process each knowledge item
    for (const knowledgeId of knowledgeIds) {
      try {
        const knowledge = await getKnowledgeById(knowledgeId);

        // Check if source agent owns this knowledge
        if (knowledge.ownerId !== sourceAgentId) {
          console.warn(
            `${LOG_PREFIX} Agent ${sourceAgentId} does not own knowledge ${knowledgeId}`,
          );
          continue;
        }

        // Create a transfer record
        await db.collection(COLLECTIONS.KNOWLEDGE_TRANSFERS).add({
          knowledgeId,
          sourceAgentId,
          targetAgentId,
          createdAt: now,
          status: "completed",
        });

        // Create a share record for the target agent
        await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).add({
          knowledgeId,
          sourceAgentId,
          targetAgentId,
          createdAt: now,
          expiresAt: null,
          status: "active",
        });

        transferredCount++;
      } catch (error) {
        console.error(`${LOG_PREFIX} Error transferring knowledge item ${knowledgeId}:`, error);
        // Continue with other items even if one fails
      }
    }

    return {
      success: transferredCount > 0,
      transferredCount,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error transferring knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Helper functions
 */
async function getKnowledgeById(knowledgeId: string): Promise<Knowledge> {
  const knowledgeDoc = await db.collection(COLLECTIONS.KNOWLEDGE).doc(knowledgeId).get();

  if (!knowledgeDoc.exists) {
    throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
  }

  return {
    id: knowledgeDoc.id,
    ...knowledgeDoc.data(),
  } as Knowledge;
}

async function checkKnowledgeAccess(knowledge: Knowledge, requesterId: string): Promise<boolean> {
  // Public knowledge is accessible to everyone
  if (knowledge.accessLevel === "public") {
    return true;
  }

  // Owner always has access
  if (knowledge.ownerId === requesterId) {
    return true;
  }

  // For restricted knowledge, check agent rank
  if (knowledge.accessLevel === "restricted") {
    try {
      const requesterAgent = await getAgent(requesterId);
      const ownerAgent = await getAgent(knowledge.ownerId);

      if (!requesterAgent || !ownerAgent) {
        return false;
      }

      const requesterRankLevel = AGENT_RANK_HIERARCHY[requesterAgent.identity.rank] || 0;
      const ownerRankLevel = AGENT_RANK_HIERARCHY[ownerAgent.identity.rank] || 0;

      // Requester must be of equal or higher rank than the owner
      return requesterRankLevel >= ownerRankLevel;
    } catch (error) {
      return false;
    }
  }

  // For private knowledge, check explicit sharing
  if (knowledge.accessLevel === "private") {
    const shareQuery = await db
      .collection(COLLECTIONS.KNOWLEDGE_SHARES)
      .where("knowledgeId", "==", knowledge.id)
      .where("targetAgentId", "==", requesterId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (shareQuery.empty) {
      return false;
    }

    const share = shareQuery.docs[0].data();

    // Check if share has expired
    if (share.expiresAt && share.expiresAt.toMillis() < Timestamp.now().toMillis()) {
      return false;
    }

    return true;
  }

  return false;
}

function formatKnowledgeResponse(knowledge: Knowledge): KnowledgeResponse {
  return {
    ...knowledge,
    createdAt: knowledge.createdAt.toMillis(),
    updatedAt: knowledge.updatedAt.toMillis(),
  };
}
