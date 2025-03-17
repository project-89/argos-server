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
import { ApiError } from "../utils";
import { hasPermission } from "./role.service";
import { getAgent } from "./agent.service";

// Import MongoDB utilities
import { getDb, toObjectId, formatDocument, formatDocuments } from "../utils/mongodb";

const LOG_PREFIX = "[Knowledge Service]";

/**
 * Compress knowledge content based on domain
 */
export async function compressKnowledge(
  content: string,
  domain: KnowledgeDomain,
  requesterId: string,
): Promise<CompressKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Compressing knowledge for domain:`, domain);

    // For now, we'll implement a simple compression algorithm
    // In a real implementation, this might use specialized algorithms per domain
    // or even ML-based techniques

    // Simple placeholder compression (in reality, use a proper algorithm)
    const compressedContent = `COMPRESSED:${domain}:${Buffer.from(content).toString("base64")}`;

    return {
      compressedContent,
      domain,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error compressing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_COMPRESS_KNOWLEDGE);
  }
}

/**
 * Decompress knowledge content based on domain
 */
export async function decompressKnowledge(
  content: string,
  domain: KnowledgeDomain,
  requesterId: string,
): Promise<DecompressKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Decompressing knowledge for domain:`, domain);

    // Simple placeholder decompression (in reality, use a proper algorithm)
    if (!content.startsWith("COMPRESSED:")) {
      throw new ApiError(400, "Content is not in compressed format");
    }

    const parts = content.split(":");
    if (parts.length < 3 || parts[1] !== domain) {
      throw new ApiError(400, "Invalid compressed content or domain mismatch");
    }

    const decompressedContent = Buffer.from(parts[2], "base64").toString();

    return {
      decompressedContent,
      domain,
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
    console.log(`${LOG_PREFIX} Fetching knowledge:`, knowledgeId);

    const db = await getDb();
    const knowledge = await db.collection(COLLECTIONS.KNOWLEDGE).findOne({
      _id: toObjectId(knowledgeId),
    });

    if (!knowledge) {
      throw new ApiError(404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
    }

    const formattedKnowledge = formatDocument<Knowledge>(knowledge);

    // Check access permissions
    if (formattedKnowledge.ownerId !== requesterId) {
      // Check if requesterId has a share for this knowledge
      const share = await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).findOne({
        knowledgeId,
        targetAgentId: requesterId,
        status: "active",
      });

      // Check if there is an expired share
      if (share && share.expiresAt && new Date() > share.expiresAt) {
        throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
      }

      // If requester is an agent, check if they have sufficient rank
      const agent = await getAgent(requesterId);
      if (agent && agent.identity.rank < formattedKnowledge.requiredRank) {
        throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_RANK);
      }

      if (!share && formattedKnowledge.ownerId !== requesterId) {
        throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
      }
    }

    return formattedKnowledge;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching knowledge:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.KNOWLEDGE_NOT_FOUND);
  }
}

/**
 * Update knowledge
 */
export async function updateKnowledge(
  knowledgeId: string,
  updates: Partial<Knowledge>,
  requesterId: string,
): Promise<Knowledge> {
  try {
    console.log(`${LOG_PREFIX} Updating knowledge:`, knowledgeId);

    const db = await getDb();
    const knowledge = await getKnowledge(knowledgeId, requesterId);

    // Check if requester is the owner or has modify access
    if (knowledge.ownerId !== requesterId) {
      const share = await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).findOne({
        knowledgeId,
        targetAgentId: requesterId,
        accessLevel: "modify",
        status: "active",
      });

      if (!share) {
        throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
      }

      // Check if share has expired
      if (share.expiresAt && new Date() > share.expiresAt) {
        throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
      }
    }

    const now = new Date();

    const updateData = {
      ...updates,
      updatedAt: now,
    };

    await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .updateOne({ _id: toObjectId(knowledgeId) }, { $set: updateData });

    const updatedKnowledge: Knowledge = {
      ...knowledge,
      ...updates,
      updatedAt: now,
    };

    return updatedKnowledge;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_KNOWLEDGE);
  }
}

/**
 * List knowledge
 */
export async function listKnowledge(
  requesterId: string,
  domain?: KnowledgeDomain,
  status?: string,
  limit: number = 20,
  offset: number = 0,
): Promise<ListKnowledgeResponse> {
  try {
    console.log(`${LOG_PREFIX} Listing knowledge for requester:`, requesterId);

    const db = await getDb();

    // Build query
    const query: any = {
      $or: [
        { ownerId: requesterId },
        { _id: { $in: await getAccessibleKnowledgeIds(requesterId) } },
      ],
    };

    if (domain) {
      query.domain = domain;
    }

    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await db.collection(COLLECTIONS.KNOWLEDGE).countDocuments(query);

    // Get items with pagination
    const items = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      items: formatDocuments<Knowledge>(items),
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
    console.log(`${LOG_PREFIX} Sharing knowledge ${knowledgeId} with agent ${targetAgentId}`);

    // Verify knowledge exists and requester has access
    const knowledge = await getKnowledge(knowledgeId, requesterId);

    // Verify requester is the owner
    if (knowledge.ownerId !== requesterId) {
      throw new ApiError(403, ERROR_MESSAGES.KNOWLEDGE_ACCESS_DENIED);
    }

    // Verify target agent exists
    const targetAgent = await getAgent(targetAgentId);
    if (!targetAgent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    // Check if target agent has sufficient rank
    if (targetAgent.identity.rank < knowledge.requiredRank) {
      throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_RANK);
    }

    const db = await getDb();
    const now = new Date();

    // Check if a share already exists
    const existingShare = await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).findOne({
      knowledgeId,
      targetAgentId,
      status: "active",
    });

    if (existingShare) {
      // Update existing share
      await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).updateOne(
        { _id: existingShare._id },
        {
          $set: {
            accessLevel,
            expiresAt,
            updatedAt: now,
          },
        },
      );

      return formatDocument<KnowledgeShare>({
        ...existingShare,
        accessLevel,
        expiresAt,
        updatedAt: now,
      });
    }

    // Create new share
    const share: Omit<KnowledgeShare, "id"> = {
      knowledgeId,
      ownerId: requesterId,
      targetAgentId,
      status: "active",
      accessLevel,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).insertOne(share);
    const shareId = result.insertedId.toString();

    console.log(`${LOG_PREFIX} Successfully shared knowledge:`, shareId);
    return { id: shareId, ...share };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error sharing knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_SHARE_KNOWLEDGE);
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
    console.log(`${LOG_PREFIX} Transferring knowledge from ${sourceAgentId} to ${targetAgentId}`);

    // Check if requester has agent_creator role
    const hasAgentCreatorRole = await hasPermission(requesterId, "manage_agents");
    if (!hasAgentCreatorRole) {
      throw new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED);
    }

    // Verify knowledge exists
    const knowledge = await getKnowledge(knowledgeId, sourceAgentId);

    // Verify both agents exist
    const sourceAgent = await getAgent(sourceAgentId);
    const targetAgent = await getAgent(targetAgentId);

    if (!sourceAgent || !targetAgent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    // Check if target agent has sufficient rank
    if (targetAgent.identity.rank < knowledge.requiredRank) {
      throw new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_RANK);
    }

    const db = await getDb();
    const now = new Date();

    // Create transfer record
    const transfer: Omit<KnowledgeTransfer, "id"> = {
      knowledgeId,
      sourceAgentId,
      targetAgentId,
      status: "pending",
      transferMethod,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.KNOWLEDGE_TRANSFERS).insertOne(transfer);
    const transferId = result.insertedId.toString();

    // Perform the actual transfer
    if (transferMethod === "copy") {
      // Create a copy of the knowledge with the new owner
      const knowledgeCopy: Omit<Knowledge, "id"> = {
        ...knowledge,
        ownerId: targetAgentId,
        createdAt: now,
        updatedAt: now,
      };

      // Remove the original ID
      delete (knowledgeCopy as any).id;

      // Insert the copy
      await db.collection(COLLECTIONS.KNOWLEDGE).insertOne(knowledgeCopy);
    } else if (transferMethod === "move") {
      // Update the owner
      await db.collection(COLLECTIONS.KNOWLEDGE).updateOne(
        { _id: toObjectId(knowledgeId) },
        {
          $set: {
            ownerId: targetAgentId,
            updatedAt: now,
          },
        },
      );

      // Remove any shares
      await db.collection(COLLECTIONS.KNOWLEDGE_SHARES).updateMany(
        { knowledgeId },
        {
          $set: {
            status: "revoked",
            updatedAt: now,
          },
        },
      );
    }

    // Update transfer status
    await db.collection(COLLECTIONS.KNOWLEDGE_TRANSFERS).updateOne(
      { _id: toObjectId(transferId) },
      {
        $set: {
          status: "completed",
          completedAt: now,
          updatedAt: now,
        },
      },
    );

    console.log(`${LOG_PREFIX} Successfully transferred knowledge:`, transferId);
    return {
      id: transferId,
      ...transfer,
      status: "completed",
      completedAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error transferring knowledge:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_TRANSFER_KNOWLEDGE);
  }
}

/**
 * Helper function to get IDs of knowledge the requester has access to
 */
async function getAccessibleKnowledgeIds(requesterId: string): Promise<string[]> {
  const db = await getDb();

  // Find all active shares for this user
  const shares = await db
    .collection(COLLECTIONS.KNOWLEDGE_SHARES)
    .find({
      targetAgentId: requesterId,
      status: "active",
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    })
    .toArray();

  return shares.map((share) => share.knowledgeId);
}
