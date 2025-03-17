export * from "./error";
export * from "./api-key";
export * from "./request";
export * from "./response";
export * from "./object";
export * from "./timestamp";
export * from "./wallet";
export * from "./hash";
export { default as mongodb } from "./mongodb";

import { getMongoClient } from "./mongodb";

/**
 * Initialize database connections
 */
export async function initDatabases() {
  try {
    // Initialize MongoDB
    const client = await getMongoClient();
    console.log("MongoDB initialized successfully");

    // Initialize Firebase (to be removed after migration)
    // Keep existing Firebase initialization if needed during transition

    return { mongodb: client };
  } catch (error) {
    console.error("Failed to initialize databases:", error);
    throw error;
  }
}
