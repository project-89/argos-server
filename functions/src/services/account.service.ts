import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  LinkFingerprintRequest,
  AccountResponse,
} from "../schemas";
import { TransitoryFingerprint } from "../types";
import { ApiError } from "../utils/error";

import { verifySignature } from "../utils";
import { getFingerprintById } from "./";

export const createAccount = async (request: CreateAccountRequest): Promise<AccountResponse> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);

    const { walletAddress, fingerprintIds = [], transitoryFingerprintId } = request.body;

    // Check if account with wallet address already exists
    const existingAccount = await getAccountByWalletAddress(walletAddress);
    if (existingAccount) {
      throw new ApiError(400, ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS);
    }

    // Verify all fingerprints exist
    if (fingerprintIds.length > 0) {
      await Promise.all(
        fingerprintIds.map(async (fingerprintId) => {
          const fingerprint = await getFingerprintById(fingerprintId);
          if (!fingerprint) {
            throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
          }
        }),
      );
    }

    // If transitoryFingerprintId is provided, verify and link it
    if (transitoryFingerprintId) {
      const transitoryRef = db
        .collection(COLLECTIONS.TRANSITORY_FINGERPRINTS)
        .doc(transitoryFingerprintId);
      const transitoryDoc = await transitoryRef.get();

      if (!transitoryDoc.exists) {
        throw new ApiError(404, ERROR_MESSAGES.TRANSITORY_FINGERPRINT_NOT_FOUND);
      }

      const transitoryData = transitoryDoc.data() as TransitoryFingerprint;

      // If the transitory fingerprint has a linked fingerprint, add it to fingerprintIds
      if (
        transitoryData.linkedFingerprintId &&
        !fingerprintIds.includes(transitoryData.linkedFingerprintId)
      ) {
        fingerprintIds.push(transitoryData.linkedFingerprintId);
      }

      // Update transitory fingerprint status
      await transitoryRef.update({
        status: "claimed",
        claimedAt: Timestamp.now(),
        walletAddress,
      });
    }

    const now = Timestamp.now();
    const account: Omit<Account, "id"> = {
      walletAddress,
      fingerprintIds,
      createdAt: now,
      lastLogin: now,
      status: "active",
      metadata: {},
    };

    const docRef = await accountsRef.add(account);

    // Update all linked fingerprints with the account ID
    await Promise.all(
      fingerprintIds.map((fingerprintId) =>
        db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).update({
          accountId: docRef.id,
          walletAddress,
        }),
      ),
    );

    return formatAccountResponse({ id: docRef.id, ...account });
  } catch (error) {
    console.error("[Create Account] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      body: request.body,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_ACCOUNT);
  }
};

export const getAccountById = async (id: string): Promise<Account | null> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);
    const doc = await accountsRef.doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Account) : null;
  } catch (error) {
    console.error("[Get Account By Id] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      id,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ACCOUNT);
  }
};

export const getAccountByWalletAddress = async (walletAddress: string): Promise<Account | null> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);
    const snapshot = await accountsRef.where("walletAddress", "==", walletAddress).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Account;
  } catch (error) {
    console.error("[Get Account By Wallet Address] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      walletAddress,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ACCOUNT);
  }
};

export const updateAccount = async ({
  accountId,
  request,
}: {
  accountId: string;
  request: UpdateAccountRequest;
}): Promise<AccountResponse> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);
    const account = await getAccountById(accountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    const updateData = {
      ...request.body,
    };

    await accountsRef.doc(accountId).update(updateData);
    return formatAccountResponse({ ...account, ...updateData });
  } catch (error) {
    console.error("[Update Account] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      request,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_ACCOUNT);
  }
};

export const linkFingerprint = async ({
  accountId,
  request,
}: {
  accountId: string;
  request: LinkFingerprintRequest;
}): Promise<AccountResponse> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);
    const { fingerprintId } = request.params;
    const { signature } = request.body;
    const account = await getAccountById(accountId);

    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Verify fingerprint exists
    const fingerprint = await getFingerprintById(fingerprintId);
    if (!fingerprint) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Verify signature
    const isValid = await verifySignature(signature, account.walletAddress, fingerprintId);
    if (!isValid) {
      throw new ApiError(401, ERROR_MESSAGES.INVALID_SIGNATURE);
    }

    // Check if fingerprint is already linked to another account
    const existingAccount = await accountsRef
      .where("fingerprintIds", "array-contains", fingerprintId)
      .limit(1)
      .get();

    if (!existingAccount.empty) {
      const doc = existingAccount.docs[0];
      if (doc.id !== accountId) {
        throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_ALREADY_LINKED);
      }
    }

    // Add fingerprint to account if not already present
    if (!account.fingerprintIds.includes(fingerprintId)) {
      const updatedFingerprintIds = [...account.fingerprintIds, fingerprintId];
      const now = Timestamp.now();
      await accountsRef.doc(accountId).update({
        fingerprintIds: updatedFingerprintIds,
        "metadata.lastSignature": signature,
        "metadata.lastSignatureTimestamp": now,
      });
      return formatAccountResponse({
        ...account,
        fingerprintIds: updatedFingerprintIds,
        metadata: {
          ...account.metadata,
          lastSignature: signature,
          lastSignatureTimestamp: now,
        },
      });
    }

    return formatAccountResponse(account);
  } catch (error) {
    console.error("[Link Fingerprint] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      request,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_LINK_FINGERPRINT);
  }
};

export const unlinkFingerprint = async ({
  accountId,
  fingerprintId,
}: {
  accountId: string;
  fingerprintId: string;
}): Promise<AccountResponse> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);
    const account = await getAccountById(accountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    if (!account.fingerprintIds.includes(fingerprintId)) {
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_NOT_LINKED);
    }

    const updatedFingerprintIds = account.fingerprintIds.filter((id) => id !== fingerprintId);
    await accountsRef.doc(accountId).update({ fingerprintIds: updatedFingerprintIds });

    return formatAccountResponse({ ...account, fingerprintIds: updatedFingerprintIds });
  } catch (error) {
    console.error("[Unlink Fingerprint] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      fingerprintId,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UNLINK_FINGERPRINT);
  }
};

export const verifyAccountOwnership = async (
  accountId: string,
  walletAddress: string,
): Promise<boolean> => {
  try {
    const account = await getAccountById(accountId);
    return account?.walletAddress === walletAddress;
  } catch (error) {
    console.error("[Verify Account Ownership] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      walletAddress,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VERIFY_ACCOUNT_OWNERSHIP);
  }
};

// Helper function to format account response
const formatAccountResponse = (account: Account): AccountResponse => ({
  id: account.id,
  walletAddress: account.walletAddress,
  fingerprintIds: account.fingerprintIds,
  status: account.status,
  createdAt: account.createdAt.toMillis(),
  lastLogin: account.lastLogin.toMillis(),
  metadata: {
    lastSignature: account.metadata.lastSignature,
    lastSignatureTimestamp: account.metadata.lastSignatureTimestamp?.toMillis(),
  },
});
