import { ACCOUNT_ROLE, COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Account, CreateAccountRequest, UpdateAccountRequest, AccountResponse } from "../schemas";
import { ApiError, verifySignature } from "../utils";
import { getFingerprintById } from ".";

// Import MongoDB utilities
import { getDb, toObjectId, formatDocument, formatDocuments } from "../utils/mongodb";

export const createAccount = async (request: CreateAccountRequest): Promise<AccountResponse> => {
  try {
    const db = await getDb();
    const { walletAddress, fingerprintId, signature, message, onboardingId } = request.body;

    // Verify wallet signature
    const isValidSignature = await verifySignature(signature, walletAddress, message);
    if (!isValidSignature) {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_SIGNATURE);
    }

    // Check if account with wallet address already exists
    const existingAccount = await getAccountByWalletAddress(walletAddress);
    if (existingAccount) {
      throw new ApiError(400, ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS);
    }

    // Get onboarding progress to verify social identity
    const onboardingDoc = await db
      .collection(COLLECTIONS.ONBOARDING)
      .findOne({ _id: onboardingId });
    if (!onboardingDoc) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    if (onboardingDoc.stage !== "wallet_created") {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_MISSION_ORDER);
    }

    if (onboardingDoc.fingerprintId !== fingerprintId) {
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_MISMATCH);
    }

    // Verify fingerprint exists
    const fingerprint = await getFingerprintById(fingerprintId);
    if (!fingerprint) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Check if fingerprint is already linked to another account
    const existingAccountWithFingerprint = await db
      .collection(COLLECTIONS.ACCOUNTS)
      .findOne({ fingerprintId });

    if (existingAccountWithFingerprint) {
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_ALREADY_LINKED);
    }

    const now = new Date();

    // Get the verified social identity from onboarding
    const verifiedIdentity = onboardingDoc.metadata?.verifiedSocialIdentity;
    if (!verifiedIdentity) {
      throw new ApiError(400, ERROR_MESSAGES.SOCIAL_IDENTITY_REQUIRED);
    }

    // Create the account with verified social identity
    const account: Omit<Account, "id"> = {
      walletAddress,
      fingerprintId,
      createdAt: now,
      lastLogin: now,
      status: "active",
      roles: [ACCOUNT_ROLE.user],
      anonUserId: verifiedIdentity.anonUserId,
      metadata: {},
    };

    // Insert the account into MongoDB
    const result = await db.collection(COLLECTIONS.ACCOUNTS).insertOne(account);
    const accountId = result.insertedId.toString();

    // Update the fingerprint with the account ID
    await db.collection(COLLECTIONS.FINGERPRINTS).updateOne(
      { _id: fingerprintId },
      {
        $set: {
          accountId,
          walletAddress,
        },
      },
    );

    // Update the anon social user record
    await db.collection(COLLECTIONS.ANON_USERS).updateOne(
      { _id: verifiedIdentity.anonUserId },
      {
        $set: {
          status: "claimed",
          linkedAccountId: accountId,
          claimedAt: now,
          updatedAt: now,
        },
      },
    );

    // Update onboarding status
    await db.collection(COLLECTIONS.ONBOARDING).updateOne(
      { _id: onboardingId },
      {
        $set: {
          stage: "hivemind_connected",
          accountId,
          updatedAt: now,
        },
      },
    );

    return formatAccountResponse({ id: accountId, ...account });
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
    const db = await getDb();
    const accountDoc = await db
      .collection(COLLECTIONS.ACCOUNTS)
      .findOne({ _id: toObjectId(accountId) });

    if (!accountDoc) {
      return null;
    }

    return formatDocument<Account>(accountDoc);
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
    const db = await getDb();
    const accountDoc = await db.collection(COLLECTIONS.ACCOUNTS).findOne({ walletAddress });

    if (!accountDoc) {
      return null;
    }

    return formatDocument<Account>(accountDoc);
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
    const db = await getDb();
    const account = await getAccountById(accountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    const updateData = {
      ...request.body,
    };

    await db
      .collection(COLLECTIONS.ACCOUNTS)
      .updateOne({ _id: toObjectId(accountId) }, { $set: updateData });

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

export const verifyAccountOwnership = async ({
  accountId,
  walletAddress,
}: {
  accountId: string;
  walletAddress: string;
}): Promise<boolean> => {
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
    roles: account.roles,
    metadata: account.metadata,
  };
};
