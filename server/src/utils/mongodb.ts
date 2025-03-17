import { MongoClient, Db, ObjectId, ClientSession, FindOptions } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/argosDB";
let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get the MongoDB client instance
 * @returns MongoDB client
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    // Add process listeners for graceful shutdown
    process.on("SIGINT", closeConnection);
    process.on("SIGTERM", closeConnection);
  }
  return client;
}

/**
 * Get the MongoDB database instance
 * @returns MongoDB database
 */
export async function getDb(): Promise<Db> {
  if (!db) {
    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DATABASE || "argosDB";
    db = client.db(dbName);
  }
  return db;
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

/**
 * Start a MongoDB transaction session
 * @returns MongoDB session
 */
export async function startSession(): Promise<ClientSession> {
  const client = await getMongoClient();
  const session = client.startSession();
  session.startTransaction();
  return session;
}

/**
 * Commit a MongoDB transaction
 * @param session MongoDB session
 */
export async function commitTransaction(session: ClientSession): Promise<void> {
  await session.commitTransaction();
  session.endSession();
}

/**
 * Abort a MongoDB transaction
 * @param session MongoDB session
 */
export async function abortTransaction(session: ClientSession): Promise<void> {
  await session.abortTransaction();
  session.endSession();
}

/**
 * Convert string ID to MongoDB ObjectId
 * @param id The string ID to convert
 * @returns MongoDB ObjectId
 */
export function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new Error(`Invalid MongoDB ObjectId: ${id}`);
  }
}

/**
 * Safely convert string ID to MongoDB ObjectId, returning null if invalid
 * @param id The string ID to convert
 * @returns MongoDB ObjectId or null if invalid
 */
export function safeObjectId(id: string | null | undefined): ObjectId | null {
  if (!id) return null;

  try {
    return new ObjectId(id);
  } catch (error) {
    return null;
  }
}

/**
 * Convert array of string IDs to MongoDB ObjectIds
 * @param ids Array of string IDs
 * @returns Array of MongoDB ObjectIds
 */
export function toObjectIds(ids: string[]): ObjectId[] {
  return ids
    .map((id) => {
      try {
        return new ObjectId(id);
      } catch (error) {
        return null;
      }
    })
    .filter((id): id is ObjectId => id !== null);
}

/**
 * Convert MongoDB document to API response format
 * @param doc MongoDB document
 * @returns Document with _id converted to id
 */
export function formatDocument<T>(doc: Record<string, any> | null): T | null {
  if (!doc) return null;

  const { _id, ...rest } = doc;
  return {
    id: _id ? _id.toString() : undefined,
    ...rest,
  } as T;
}

/**
 * Convert multiple MongoDB documents to API response format
 * @param docs Array of MongoDB documents
 * @returns Array of documents with _id converted to id
 */
export function formatDocuments<T>(docs: Record<string, any>[] | null | undefined): T[] {
  if (!docs || !Array.isArray(docs)) return [];
  return docs.map((doc) => formatDocument<T>(doc)).filter((doc): doc is T => doc !== null);
}

/**
 * Convert API document to MongoDB format
 * @param doc API document
 * @returns Document with id converted to _id
 */
export function toMongoDocument(doc: Record<string, any> | null): Record<string, any> | null {
  if (!doc) return null;

  const { id, ...rest } = doc;
  const result = { ...rest };

  if (id) {
    try {
      result._id = new ObjectId(id);
    } catch (error) {
      // If id isn't a valid ObjectId, just use it as a string
      result._id = id;
    }
  }

  return result;
}

/**
 * Create pagination parameters for MongoDB queries
 * @param page Page number (1-based)
 * @param limit Items per page
 * @returns MongoDB skip and limit values
 */
export function createPagination(
  page: number = 1,
  limit: number = 20,
): { skip: number; limit: number } {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit)); // Limit between 1 and 100

  return {
    skip: (validPage - 1) * validLimit,
    limit: validLimit,
  };
}

/**
 * Create MongoDB find options with pagination and sorting
 * @param options Pagination and sorting options
 * @returns MongoDB FindOptions
 */
export function createFindOptions({
  page = 1,
  limit = 20,
  sortField = "createdAt",
  sortOrder = -1,
}: {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 1 | -1;
}): FindOptions {
  const { skip, limit: validLimit } = createPagination(page, limit);

  return {
    skip,
    limit: validLimit,
    sort: { [sortField]: sortOrder },
  };
}

/**
 * Handle MongoDB errors consistently
 * @param error Error object
 * @param operation Description of the operation that failed
 * @returns Standardized error message
 */
export function handleMongoError(error: any, operation: string): Error {
  console.error(`MongoDB Error during ${operation}:`, error);

  // Check for specific MongoDB error types
  if (error.code === 11000) {
    return new Error(`Duplicate key error: ${JSON.stringify(error.keyValue)}`);
  }

  return new Error(`Database error during ${operation}: ${error.message}`);
}

export default {
  getMongoClient,
  getDb,
  closeConnection,
  toObjectId,
  safeObjectId,
  toObjectIds,
  formatDocument,
  formatDocuments,
  toMongoDocument,
  startSession,
  commitTransaction,
  abortTransaction,
  createPagination,
  createFindOptions,
  handleMongoError,
};
