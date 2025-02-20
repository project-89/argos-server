import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { AgentInvite, CreateInviteRequest } from "../schemas";
import { ApiError } from "../utils";

const LOG_PREFIX = "[Agent Invite Service]";
const db = getFirestore();

export async function createInvite(
  request: CreateInviteRequest["body"],
  adminId: string,
): Promise<AgentInvite> {
  try {
    console.log(`${LOG_PREFIX} Creating new agent invite`);

    const now = Timestamp.now();
    const inviteCode = nanoid(12); // Generate unique 12-character invite code

    const invite: AgentInvite = {
      id: inviteCode,
      createdBy: adminId,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(
        now.toMillis() + (request.expiresIn || 7 * 24 * 60 * 60) * 1000,
      ), // Default 7 days
      maxUses: request.maxUses || 1,
      useCount: 0,
      isRevoked: false,
      metadata: request.metadata || {},
    };

    await db.collection(COLLECTIONS.AGENT_INVITES).doc(inviteCode).set(invite);

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

    const inviteDoc = await db.collection(COLLECTIONS.AGENT_INVITES).doc(inviteCode).get();

    if (!inviteDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.INVITE_NOT_FOUND);
    }

    const invite = inviteDoc.data() as AgentInvite;

    // Check if invite is valid
    if (invite.isRevoked) {
      throw new ApiError(400, ERROR_MESSAGES.INVITE_REVOKED);
    }

    if (invite.useCount >= invite.maxUses) {
      throw new ApiError(400, ERROR_MESSAGES.INVITE_EXHAUSTED);
    }

    if (invite.expiresAt.toMillis() < Timestamp.now().toMillis()) {
      throw new ApiError(400, ERROR_MESSAGES.INVITE_EXPIRED);
    }

    return invite;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error validating invite:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.INVITE_NOT_FOUND);
  }
}

export async function useInvite(inviteCode: string, agentId: string): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Using invite:`, inviteCode);

    // Run in transaction to prevent race conditions
    await db.runTransaction(async (transaction) => {
      const inviteRef = db.collection(COLLECTIONS.AGENT_INVITES).doc(inviteCode);
      const inviteDoc = await transaction.get(inviteRef);

      if (!inviteDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.INVITE_NOT_FOUND);
      }

      const invite = inviteDoc.data() as AgentInvite;

      // Revalidate in transaction
      if (
        invite.isRevoked ||
        invite.useCount >= invite.maxUses ||
        invite.expiresAt.toMillis() < Timestamp.now().toMillis()
      ) {
        throw new ApiError(400, ERROR_MESSAGES.INVITE_INVALID);
      }

      // Update invite
      transaction.update(inviteRef, {
        useCount: invite.useCount + 1,
        usedBy: agentId,
        usedAt: Timestamp.now(),
      });
    });

    console.log(`${LOG_PREFIX} Successfully used invite:`, inviteCode);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error using invite:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.INVITE_NOT_FOUND);
  }
}

export async function revokeInvite(inviteCode: string): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Revoking invite:`, inviteCode);

    await db.collection(COLLECTIONS.AGENT_INVITES).doc(inviteCode).update({
      isRevoked: true,
    });

    console.log(`${LOG_PREFIX} Successfully revoked invite:`, inviteCode);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error revoking invite:`, error);
    throw ApiError.from(error, 404, ERROR_MESSAGES.INVITE_NOT_FOUND);
  }
}
