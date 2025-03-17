/**
 * MongoDB Indexes Creation Script
 *
 * This script creates the necessary indexes for MongoDB collections
 * Run with: node create-mongodb-indexes.js
 *
 * You must have a .env file in the server directory with MONGODB_URI and MONGODB_DATABASE values.
 */

require("dotenv").config({ path: "../.env" });
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/argosDB";
const DB_NAME = process.env.MONGODB_DATABASE || "argosDB";

// Collection names
const COLLECTIONS = {
  ACCOUNTS: "accounts",
  AGENTS: "agents",
  FINGERPRINTS: "fingerprints",
  VISITS: "visits",
  TAGS: "tags",
  IMPRESSIONS: "impressions",
  PROFILES: "profiles",
  KNOWLEDGE: "knowledge",
  KNOWLEDGE_SHARES: "knowledge-shares",
  KNOWLEDGE_TRANSFERS: "knowledge-transfers",
  MISSIONS: "missions",
  MISSION_LOGS: "mission-logs",
  MISSION_RESULTS: "mission-results",
  ONBOARDING: "onboarding",
  AGENT_INVITES: "agent-invites",
  ANON_USERS: "anon-users",
};

async function createIndexes() {
  console.log("Creating MongoDB indexes...");
  console.log(`URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`); // Hide credentials in logs
  console.log(`Database: ${DB_NAME}`);

  let client;

  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Successfully connected to MongoDB");

    // Get database
    const db = client.db(DB_NAME);

    // Create indexes for each collection
    const indexPromises = [
      // Accounts collection
      createCollectionIndexes(db, COLLECTIONS.ACCOUNTS, [
        { keys: { walletAddress: 1 }, options: { unique: true } },
        { keys: { fingerprintId: 1 }, options: { sparse: true } },
        { keys: { status: 1 }, options: {} },
        { keys: { roles: 1 }, options: {} },
      ]),

      // Agents collection
      createCollectionIndexes(db, COLLECTIONS.AGENTS, [
        { keys: { "identity.walletAddress": 1 }, options: { sparse: true } },
        { keys: { "identity.rank": 1 }, options: {} },
        { keys: { capabilities: 1 }, options: {} },
        { keys: { "state.status": 1 }, options: {} },
        { keys: { "state.isAvailable": 1 }, options: {} },
        { keys: { "state.lastActiveAt": -1 }, options: {} },
      ]),

      // Fingerprints collection
      createCollectionIndexes(db, COLLECTIONS.FINGERPRINTS, [
        { keys: { hash: 1 }, options: { unique: true } },
        { keys: { accountId: 1 }, options: { sparse: true } },
        { keys: { walletAddress: 1 }, options: { sparse: true } },
        { keys: { createdAt: -1 }, options: {} },
      ]),

      // Visits collection
      createCollectionIndexes(db, COLLECTIONS.VISITS, [
        { keys: { fingerprintId: 1 }, options: {} },
        { keys: { createdAt: -1 }, options: {} },
        { keys: { "metadata.path": 1 }, options: {} },
        { keys: { "metadata.source": 1 }, options: {} },
      ]),

      // Profiles collection
      createCollectionIndexes(db, COLLECTIONS.PROFILES, [
        { keys: { fingerprintId: 1 }, options: { unique: true } },
        { keys: { walletAddress: 1 }, options: { unique: true } },
        { keys: { username: "text", bio: "text" }, options: {} },
      ]),

      // Knowledge collection
      createCollectionIndexes(db, COLLECTIONS.KNOWLEDGE, [
        { keys: { ownerId: 1 }, options: {} },
        { keys: { domain: 1 }, options: {} },
        { keys: { status: 1 }, options: {} },
        { keys: { requiredRank: 1 }, options: {} },
        { keys: { tags: 1 }, options: {} },
        { keys: { title: "text", description: "text" }, options: {} },
      ]),

      // Knowledge shares collection
      createCollectionIndexes(db, COLLECTIONS.KNOWLEDGE_SHARES, [
        { keys: { knowledgeId: 1, targetAgentId: 1, status: 1 }, options: {} },
        { keys: { ownerId: 1 }, options: {} },
        { keys: { expiresAt: 1 }, options: {} },
      ]),

      // Missions collection
      createCollectionIndexes(db, COLLECTIONS.MISSIONS, [
        { keys: { agentId: 1 }, options: {} },
        { keys: { status: 1 }, options: {} },
        { keys: { type: 1 }, options: {} },
        { keys: { createdAt: -1 }, options: {} },
      ]),

      // Mission logs collection
      createCollectionIndexes(db, COLLECTIONS.MISSION_LOGS, [
        { keys: { missionId: 1, timestamp: 1 }, options: {} },
        { keys: { level: 1 }, options: {} },
      ]),

      // Agent invites collection
      createCollectionIndexes(db, COLLECTIONS.AGENT_INVITES, [
        { keys: { code: 1 }, options: { unique: true } },
        { keys: { status: 1 }, options: {} },
        { keys: { createdAt: -1 }, options: {} },
      ]),
    ];

    await Promise.all(indexPromises);

    console.log("\n🎉 All MongoDB indexes created successfully!");
  } catch (err) {
    console.error("❌ Error creating MongoDB indexes:", err);
  } finally {
    if (client) {
      await client.close();
      console.log("Connection closed");
    }
  }
}

async function createCollectionIndexes(db, collectionName, indexes) {
  try {
    // Ensure collection exists by getting it
    const collection = db.collection(collectionName);

    // Create each index
    for (const index of indexes) {
      const { keys, options } = index;
      console.log(`Creating index on ${collectionName}: ${JSON.stringify(keys)}`);
      await collection.createIndex(keys, options);
    }

    console.log(`✅ Successfully created indexes for ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating indexes for ${collectionName}:`, error);
    return false;
  }
}

createIndexes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
