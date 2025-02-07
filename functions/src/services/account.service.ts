import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Account, CreateAccountRequest, UpdateAccountRequest, AccountResponse } from "../schemas";
import { TransitoryFingerprint } from "../types";
import { ApiError } from "../utils/error";
import { getFingerprintById } from "./";

export const createAccount = async (request: CreateAccountRequest): Promise<AccountResponse> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);

    const {
      walletAddress,
      fingerprintId: requestedFingerprintId,
      transitoryFingerprintId,
    } = request.body;

    // Check if account with wallet address already exists
    const existingAccount = await getAccountByWalletAddress(walletAddress);
    if (existingAccount) {
      throw new ApiError(400, ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS);
    }

    let finalFingerprintId = requestedFingerprintId;

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

      // If the transitory fingerprint has a linked fingerprint, use that
      if (transitoryData.linkedFingerprintId) {
        finalFingerprintId = transitoryData.linkedFingerprintId;
      }

      // Update transitory fingerprint status
      await transitoryRef.update({
        status: "claimed",
        claimedAt: Timestamp.now(),
        walletAddress,
      });
    }

    // Verify fingerprint exists
    if (!finalFingerprintId) {
      throw new ApiError(400, ERROR_MESSAGES.MISSING_FINGERPRINT);
    }

    const fingerprint = await getFingerprintById(finalFingerprintId);
    if (!fingerprint) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Check if fingerprint is already linked to another account
    const existingAccountWithFingerprint = await accountsRef
      .where("fingerprintId", "==", finalFingerprintId)
      .limit(1)
      .get();

    if (!existingAccountWithFingerprint.empty) {
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_ALREADY_LINKED);
    }

    const now = Timestamp.now();
    const account: Omit<Account, "id"> = {
      walletAddress,
      fingerprintId: finalFingerprintId,
      createdAt: now,
      lastLogin: now,
      status: "active",
      metadata: {},
    };

    const docRef = await accountsRef.add(account);

    // Update the fingerprint with the account ID
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(finalFingerprintId).update({
      accountId: docRef.id,
      walletAddress,
    });

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

export const getAccountById = async (accountId: string): Promise<Account | null> => {
  try {
    const db = getFirestore();
    const accountRef = db.collection(COLLECTIONS.ACCOUNTS).doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      return null;
    }

    return {
      id: accountDoc.id,
      ...accountDoc.data(),
    } as Account;
  } catch (error) {
    console.error("[Get Account] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
    });
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ACCOUNT);
  }
};

export const getAccountByWalletAddress = async (walletAddress: string): Promise<Account | null> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);
    const query = accountsRef.where("walletAddress", "==", walletAddress).limit(1);
    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
      return null;
    }

    const accountDoc = querySnapshot.docs[0];
    return {
      id: accountDoc.id,
      ...accountDoc.data(),
    } as Account;
  } catch (error) {
    console.error("[Get Account By Wallet] Error:", {
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

const formatAccountResponse = (account: Account): AccountResponse => {
  return {
    id: account.id,
    walletAddress: account.walletAddress,
    fingerprintId: account.fingerprintId,
    createdAt: account.createdAt,
    lastLogin: account.lastLogin,
    status: account.status,
    metadata: account.metadata,
  };
};
