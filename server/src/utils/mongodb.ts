import { MongoClient, Db, ObjectId, ClientSession, FindOptions, Filter } from "mongodb";
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
 * Close the MongoDB connection
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
 * Start a MongoDB session
 * @returns MongoDB session
 */
export async function startSession(): Promise<ClientSession> {
  const mongoClient = await getMongoClient();
  return mongoClient.startSession();
}

/**
 * Commit a MongoDB transaction
 * @param session MongoDB session
 */
export async function commitTransaction(session: ClientSession): Promise<void> {
  if (!session) return;

  try {
    await session.commitTransaction();
    console.log("[MongoDB] Transaction committed successfully");
  } catch (error) {
    console.error("[MongoDB] Error committing transaction:", error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Abort a MongoDB transaction
 * @param session MongoDB session
 */
export async function abortTransaction(session: ClientSession): Promise<void> {
  if (!session) return;

  try {
    await session.abortTransaction();
    console.log("[MongoDB] Transaction aborted");
  } catch (error) {
    console.error("[MongoDB] Error aborting transaction:", error);
  } finally {
    await session.endSession();
  }
}

/**
 * Creates a MongoDB _id filter that handles null ObjectIds safely
 * Compatible with MongoDB's Filter<T> type
 * @param id The id to convert to ObjectId
 * @returns A filter object with a safe _id condition or empty object if invalid
 */
export const idFilter = (id: string | null | undefined): Filter<any> => {
  if (!id) {
    // Return an empty filter to maintain compatibility with Filter<T>
    return {};
  }

  try {
    // Return a valid filter with ObjectId
    return { _id: new ObjectId(id) };
  } catch (error) {
    console.error(`[MongoDB Utils] Invalid ObjectId: ${id}`);
    // Return empty filter rather than an invalid one
    return {};
  }
};

/**
 * Converts an ObjectId to a string
 * @param id ObjectId to convert
 * @returns String ID or null
 */
export function fromObjectId(id: ObjectId | string | null | undefined): string | null {
  if (!id) return null;
  if (typeof id === "string") return id;
  return id.toString();
}

/**
 * Get the current server timestamp
 * @returns Current date
 */
export function serverTimestamp(): Date {
  return new Date();
}

/**
 * Convert various timestamp formats to a Date object
 * @param timestamp Timestamp to convert
 * @returns Date object or null
 */
export function toDate(timestamp: Date | number | string | null | undefined): Date | null {
  if (!timestamp) return null;

  try {
    if (timestamp instanceof Date) return timestamp;

    if (typeof timestamp === "number") {
      // Handle milliseconds
      return new Date(timestamp);
    }

    if (typeof timestamp === "string") {
      // Try to parse string as date
      return new Date(timestamp);
    }

    return null;
  } catch (error) {
    console.error(`[MongoDB Utils] Error converting to date:`, error);
    return null;
  }
}

/**
 * Convert various timestamp formats to milliseconds
 * @param timestamp Timestamp to convert
 * @returns Milliseconds or null
 */
export function toMillis(timestamp: Date | number | string | null | undefined): number | null {
  const date = toDate(timestamp);
  return date ? date.getTime() : null;
}

/**
 * Compare two timestamps for equality
 * @param a First timestamp
 * @param b Second timestamp
 * @returns Whether timestamps are equal
 */
export function isTimestampEqual(
  a: Date | number | string | null | undefined,
  b: Date | number | string | null | undefined,
): boolean {
  const aMillis = toMillis(a);
  const bMillis = toMillis(b);

  if (aMillis === null && bMillis === null) return true;
  if (aMillis === null || bMillis === null) return false;

  return aMillis === bMillis;
}

/**
 * Process a document for MongoDB storage
 * Handles Date objects and nested objects
 * @param doc Document to process
 * @returns Processed document
 */
export function processDocumentForMongoDB(doc: Record<string, any>): Record<string, any> {
  if (!doc) return {};

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(doc)) {
    // Skip id field - it will be handled by _id
    if (key === "id") continue;

    if (value === null || value === undefined) {
      // Skip null values
      continue;
    } else if (value instanceof Date) {
      // Keep Date objects as-is
      result[key] = value;
    } else if (Array.isArray(value)) {
      // Process array items
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null ? processDocumentForMongoDB(item) : item,
      );
    } else if (typeof value === "object") {
      // Process nested objects
      result[key] = processDocumentForMongoDB(value);
    } else {
      // Keep other values as-is
      result[key] = value;
    }
  }

  return result;
}

/**
 * Process a document from MongoDB for application use
 * @param doc Document from MongoDB
 * @returns Processed document with id field instead of _id
 */
export function processDocumentFromMongoDB(
  doc: Record<string, any> | null,
): Record<string, any> | null {
  if (!doc) return null;

  const result: Record<string, any> = {};

  // Convert _id to id string
  if (doc._id) {
    result.id = doc._id.toString();
  }

  // Process other fields
  for (const [key, value] of Object.entries(doc)) {
    if (key === "_id") continue;

    if (value instanceof Date) {
      // Convert Date to milliseconds for consistency
      result[key] = value.getTime();
    } else if (Array.isArray(value)) {
      // Process array items
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null ? processDocumentFromMongoDB(item) : item,
      );
    } else if (typeof value === "object" && value !== null) {
      // Process nested objects
      result[key] = processDocumentFromMongoDB(value);
    } else {
      // Keep other values as-is
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert an array of IDs to ObjectIds
 * @param ids Array of string IDs
 * @returns Array of ObjectIds
 */
export function toObjectIds(ids: string[]): ObjectId[] {
  return ids.map((id) => new ObjectId(id)).filter(Boolean);
}

/**
 * Format a MongoDB document for application use
 * @param doc MongoDB document
 * @returns Formatted document
 */
export function formatDocument<T>(doc: Record<string, any> | null): T | null {
  if (!doc) return null;

  const result: Record<string, any> = { ...doc };

  // Convert _id to string id
  if (doc._id) {
    result.id = doc._id.toString();
    delete result._id;
  }

  // Convert Date objects to numbers for consistency
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Date) {
      result[key] = value.getTime();
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Process nested objects
      result[key] = formatDocument(value);
    }
  }

  return result as T;
}

/**
 * Format an array of MongoDB documents
 * @param docs Array of MongoDB documents
 * @returns Array of formatted documents
 */
export function formatDocuments<T>(docs: Record<string, any>[] | null | undefined): T[] {
  if (!docs) return [];
  return docs.map((doc) => formatDocument<T>(doc)).filter(Boolean) as T[];
}

/**
 * Handle MongoDB errors
 * @param error Error to handle
 * @param operation Operation that caused the error
 * @returns Formatted error
 */
export function handleMongoError(error: any, operation: string): Error {
  console.error(`[MongoDB Error] ${operation}:`, error);

  // MongoDB-specific error handling can be added here

  return new Error(`MongoDB operation failed: ${operation}`);
}

// Export the module default
export default {
  getMongoClient,
  getDb,
  closeConnection,
  startSession,
  commitTransaction,
  abortTransaction,
  idFilter,
  fromObjectId,
  serverTimestamp,
  toDate,
  toMillis,
  isTimestampEqual,
  processDocumentForMongoDB,
  processDocumentFromMongoDB,
  toObjectIds,
  formatDocument,
  formatDocuments,
  handleMongoError,
};
