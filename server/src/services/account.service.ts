import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ACCOUNT_ROLE, COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Account, CreateAccountRequest, UpdateAccountRequest, AccountResponse } from "../schemas";
import { ApiError, verifySignature } from "../utils";
import { getFingerprintById } from ".";

export const createAccount = async (request: CreateAccountRequest): Promise<AccountResponse> => {
  try {
    const db = getFirestore();
    const accountsRef = db.collection(COLLECTIONS.ACCOUNTS);

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
    const onboardingRef = db.collection(COLLECTIONS.ONBOARDING).doc(onboardingId);
    const onboardingDoc = await onboardingRef.get();

    if (!onboardingDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    const onboarding = onboardingDoc.data();
    if (!onboarding) {
      throw new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR);
    }

    if (onboarding.stage !== "wallet_created") {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_MISSION_ORDER);
    }

    if (onboarding.fingerprintId !== fingerprintId) {
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_MISMATCH);
    }

    // Verify fingerprint exists
    const fingerprint = await getFingerprintById(fingerprintId);
    if (!fingerprint) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    // Check if fingerprint is already linked to another account
    const existingAccountWithFingerprint = await accountsRef
      .where("fingerprintId", "==", fingerprintId)
      .limit(1)
      .get();

    if (!existingAccountWithFingerprint.empty) {
      throw new ApiError(400, ERROR_MESSAGES.FINGERPRINT_ALREADY_LINKED);
    }

    const now = Timestamp.now();

    // Get the verified social identity from onboarding
    const verifiedIdentity = onboarding.metadata?.verifiedSocialIdentity;
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

    const docRef = await accountsRef.add(account);

    // Update the fingerprint with the account ID
    await db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId).update({
      accountId: docRef.id,
      walletAddress,
    });

    // Update the anon social user record
    await db.collection(COLLECTIONS.ANON_USERS).doc(verifiedIdentity.anonUserId).update({
      status: "claimed",
      linkedAccountId: docRef.id,
      claimedAt: now,
      updatedAt: now,
    });

    // Update onboarding status
    await onboardingRef.update({
      stage: "hivemind_connected",
      accountId: docRef.id,
      updatedAt: now,
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
