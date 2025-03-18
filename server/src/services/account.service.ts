import { ACCOUNT_ROLE, COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { Account, AccountResponse } from "../schemas";
import { ApiError, idFilter } from "../utils";
import { getAgent } from "./agent.service";

// Import MongoDB utilities
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";

const LOG_PREFIX = "[Account Service]";

/**
 * Get account by wallet address
 */
export const getAccountByWalletAddress = async (walletAddress: string): Promise<Account | null> => {
  try {
    console.log(`${LOG_PREFIX} Getting account by wallet address:`, walletAddress);
    const db = await getDb();

    // Normalize the wallet address to lowercase
    const normalizedWalletAddress = walletAddress.toLowerCase();

    // Find account by wallet address
    const accountDoc = await db.collection(COLLECTIONS.ACCOUNTS).findOne({
      walletAddress: normalizedWalletAddress,
    });

    if (!accountDoc) {
      return null;
    }

    return formatDocument<Account>(accountDoc);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting account by wallet address:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Get account by ID
 */
export const getAccountById = async (accountId: string): Promise<Account | null> => {
  try {
    console.log(`${LOG_PREFIX} Getting account by ID:`, accountId);
    const db = await getDb();

    // Create MongoDB filter with idFilter utility
    const filter = idFilter(accountId);
    if (!filter) {
      console.log(`${LOG_PREFIX} Invalid account ID format: ${accountId}`);
      return null;
    }

    // Find account by ID
    const accountDoc = await db.collection(COLLECTIONS.ACCOUNTS).findOne(filter);

    if (!accountDoc) {
      return null;
    }

    return formatDocument<Account>(accountDoc);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting account by ID:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

/**
 * Create new account
 */
export const createAccount = async (
  walletAddress: string,
  fingerprintId: string,
  metadata: Record<string, any> = {},
): Promise<Account> => {
  try {
    console.log(`${LOG_PREFIX} Creating account for wallet:`, walletAddress);
    const db = await getDb();

    // Check if account already exists
    const existingAccount = await getAccountByWalletAddress(walletAddress);
    if (existingAccount) {
      throw new ApiError(409, ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS);
    }

    const now = new Date();

    // Create new account document with proper typing
    const account = {
      walletAddress: walletAddress.toLowerCase(),
      fingerprintId,
      status: "active" as const,
      roles: [ACCOUNT_ROLE.user],
      metadata,
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
    };

    // Insert into database
    const result = await db.collection(COLLECTIONS.ACCOUNTS).insertOne(account);
    const accountId = result.insertedId.toString();

    console.log(`${LOG_PREFIX} Successfully created account:`, accountId);
    return { id: accountId, ...account };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating account:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_ACCOUNT);
  }
};

/**
 * Update account
 */
export const updateAccount = async ({
  accountId,
  request,
}: {
  accountId: string;
  request: any; // Using any to match existing code pattern
}): Promise<Account> => {
  try {
    console.log(`${LOG_PREFIX} Updating account:`, accountId);
    const db = await getDb();

    // Get existing account
    const account = await getAccountById(accountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Create update document
    const updateData = {
      ...request.body,
      updatedAt: new Date(),
    };

    // Create MongoDB filter with idFilter utility
    const filter = idFilter(accountId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Update in database
    await db.collection(COLLECTIONS.ACCOUNTS).updateOne(filter, { $set: updateData });

    // Return updated account
    return {
      ...account,
      ...updateData,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating account:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_UPDATE_ACCOUNT);
  }
};

/**
 * Verify account ownership
 */
export const verifyAccountOwnership = async ({
  accountId,
  walletAddress,
}: {
  accountId: string;
  walletAddress: string;
}): Promise<boolean> => {
  try {
    console.log(`${LOG_PREFIX} Verifying account ownership:`, { accountId, walletAddress });

    // Get account
    const account = await getAccountById(accountId);
    if (!account) {
      return false;
    }

    // Check if wallet address matches (case insensitive)
    return account.walletAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    console.error(`${LOG_PREFIX} Error verifying account ownership:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VERIFY_ACCOUNT_OWNERSHIP);
  }
};

/**
 * List accounts
 */
export const listAccounts = async (
  limit: number = 20,
  offset: number = 0,
  status?: string,
): Promise<{ items: Account[]; total: number; limit: number; offset: number }> => {
  try {
    console.log(`${LOG_PREFIX} Listing accounts`);
    const db = await getDb();

    // Build query
    const query: Record<string, any> = {};

    if (status) {
      query.status = status;
    }

    // Execute query with pagination
    const accountsCollection = db.collection(COLLECTIONS.ACCOUNTS);
    const cursor = accountsCollection.find(query).skip(offset).limit(limit).sort({ createdAt: -1 });

    // Get results
    const accountDocs = await cursor.toArray();
    const accounts = formatDocuments<Account>(accountDocs);
    const total = await accountsCollection.countDocuments(query);

    return {
      items: accounts,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing accounts:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
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

/**
 * Delete account
 */
export const deleteAccount = async (accountId: string): Promise<boolean> => {
  try {
    console.log(`${LOG_PREFIX} Deleting account:`, accountId);
    const db = await getDb();

    // Verify account exists
    const account = await getAccountById(accountId);
    if (!account) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Create MongoDB filter with idFilter utility
    const filter = idFilter(accountId);
    if (!filter) {
      throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
    }

    // Check if account has agents
    const agent = await getAgent(accountId);
    if (agent) {
      throw new ApiError(400, ERROR_MESSAGES.ACCOUNT_HAS_AGENTS);
    }

    // Delete account
    const result = await db.collection(COLLECTIONS.ACCOUNTS).deleteOne(filter);

    console.log(`${LOG_PREFIX} Successfully deleted account:`, accountId);
    return result.deletedCount > 0;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting account:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_DELETE_ACCOUNT);
  }
};
