export * from "./error";
export * from "./api-key";
export * from "./request";
export * from "./response";
export * from "./object";
export * from "./timestamp";
export * from "./wallet";
export * from "./hash";
export * from "./mongo-query";
export * from "./mongo-filters";
export { default as mongodb } from "./mongodb";

import { getMongoClient } from "./mongodb";
import { seedMCPTemplates } from "./seed/mcp.templates";

// Export MongoDB utilities
export {
  getDb,
  fromObjectId,
  formatDocument,
  formatDocuments,
  handleMongoError,
  serverTimestamp,
} from "./mongodb";

export { createIdFilter, createMongoQuery } from "./mongo-query";
export { idFilter, stringIdFilter, idFilterWithConditions } from "./mongo-filters";

// Export MongoDB session utilities
export {
  startMongoSession,
  commitTransaction,
  abortTransaction,
  withTransaction,
} from "./mongo-session";

// Export timestamp utilities
export { toMillis, toDate, now, formatDate, toMongoDate, getCurrentUnixMillis } from "./timestamp";

/**
 * Initialize database connections
 */
export async function initDatabases() {
  try {
    // Initialize MongoDB
    const client = await getMongoClient();
    console.log("MongoDB initialized successfully");

    // Seed initial data
    await seedMCPTemplates();

    return { mongodb: client };
  } catch (error) {
    console.error("Failed to initialize databases:", error);
    throw error;
  }
}
