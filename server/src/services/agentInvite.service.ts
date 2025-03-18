import { nanoid } from "nanoid";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { AgentInvite, CreateInviteRequest } from "../schemas";
import { ApiError } from "../utils";
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";
import { startMongoSession, withTransaction } from "../utils/mongo-session";

const LOG_PREFIX = "[Agent Invite Service]";

export async function createInvite(
  request: CreateInviteRequest["body"],
  adminId: string,
): Promise<AgentInvite> {
  try {
    console.log(`${LOG_PREFIX} Creating new agent invite`);
    const db = await getDb();

    const now = new Date();
    const inviteCode = nanoid(12); // Generate unique 12-character invite code

    const invite: AgentInvite = {
      id: inviteCode,
      createdBy: adminId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + (request.expiresIn || 7 * 24 * 60 * 60) * 1000), // Default 7 days
      maxUses: request.maxUses || 1,
      useCount: 0,
      isRevoked: false,
      metadata: request.metadata || {},
    };

    await db.collection(COLLECTIONS.AGENT_INVITES).insertOne(invite);

    console.log(`${LOG_PREFIX} Created invite:`, inviteCode);
    return invite;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating invite:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_INVITE);
  }
}

export async function validateInvite(inviteCode: string): Promise<AgentInvite> {
  try {
    console.log(`${LOG_PREFIX} Validating invite:`, inviteCode);
    const db = await getDb();

    const invite = await db.collection(COLLECTIONS.AGENT_INVITES).findOne({ id: inviteCode });

    if (!invite) {
      throw new ApiError(404, ERROR_MESSAGES.INVITE_NOT_FOUND);
    }

    // Check if invite is valid
    if (invite.isRevoked) {
      throw new ApiError(400, ERROR_MESSAGES.INVITE_REVOKED);
    }

    if (invite.useCount >= invite.maxUses) {
      throw new ApiError(400, ERROR_MESSAGES.INVITE_EXHAUSTED);
    }

    const now = new Date();
    if (invite.expiresAt < now) {
      throw new ApiError(400, ERROR_MESSAGES.INVITE_EXPIRED);
    }

    return formatDocument(invite) as AgentInvite;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error validating invite:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.INVITE_NOT_FOUND);
  }
}

export async function useInvite(inviteCode: string, agentId: string): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Using invite:`, inviteCode);
    const db = await getDb();

    // Use withTransaction pattern for better session management
    await withTransaction(async (session) => {
      const invite = await db
        .collection(COLLECTIONS.AGENT_INVITES)
        .findOne({ id: inviteCode }, { session });

      if (!invite) {
        throw new ApiError(404, ERROR_MESSAGES.INVITE_NOT_FOUND);
      }

      // Revalidate in transaction
      const now = new Date();
      if (invite.isRevoked || invite.useCount >= invite.maxUses || invite.expiresAt < now) {
        throw new ApiError(400, ERROR_MESSAGES.INVITE_INVALID);
      }

      // Update invite
      await db.collection(COLLECTIONS.AGENT_INVITES).updateOne(
        { id: inviteCode },
        {
          $set: {
            lastUsedAt: now,
          },
          $inc: { useCount: 1 },
          $push: { usedBy: agentId },
        },
        { session },
      );

      // Update agent to mark as invited
      await db.collection(COLLECTIONS.AGENTS).updateOne(
        { id: agentId },
        {
          $set: {
            inviteCode: inviteCode,
            updatedAt: now,
          },
        },
        { session },
      );
    });

    console.log(`${LOG_PREFIX} Successfully used invite:`, { inviteCode, agentId });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error using invite:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

export async function revokeInvite(inviteCode: string): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Revoking invite:`, inviteCode);
    const db = await getDb();

    const result = await db
      .collection(COLLECTIONS.AGENT_INVITES)
      .updateOne({ id: inviteCode }, { $set: { isRevoked: true } });

    if (result.matchedCount === 0) {
      throw new ApiError(404, ERROR_MESSAGES.INVITE_NOT_FOUND);
    }

    console.log(`${LOG_PREFIX} Successfully revoked invite:`, inviteCode);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error revoking invite:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.INVITE_NOT_FOUND);
  }
}

export async function listInvites(adminId: string): Promise<AgentInvite[]> {
  try {
    console.log(`${LOG_PREFIX} Listing invites for admin:`, adminId);
    const db = await getDb();

    const invites = await db
      .collection(COLLECTIONS.AGENT_INVITES)
      .find({ createdBy: adminId })
      .sort({ createdAt: -1 })
      .toArray();

    return formatDocuments(invites) as AgentInvite[];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing invites:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}
