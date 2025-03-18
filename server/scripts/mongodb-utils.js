require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const readline = require("readline");

// MongoDB connection parameters
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/argosDB";
const DB_NAME = process.env.MONGODB_DATABASE || "argosDB";

// Collection configurations
const COLLECTIONS_CONFIG = [
  { name: "accounts", indexes: [{ key: { id: 1 }, unique: true }] },
  {
    name: "profiles",
    indexes: [
      { key: { id: 1 }, unique: true },
      { key: { walletAddress: 1 }, unique: true },
    ],
  },
  { name: "agents", indexes: [{ key: { id: 1 }, unique: true }] },
  { name: "agent_invites", indexes: [{ key: { id: 1 }, unique: true }] },
  { name: "capabilities", indexes: [{ key: { profileId: 1 } }] },
  { name: "fingerprints", indexes: [{ key: { id: 1 }, unique: true }] },
  { name: "impressions", indexes: [{ key: { id: 1 }, unique: true }] },
  { name: "knowledge", indexes: [{ key: { id: 1 }, unique: true }, { key: { ownerId: 1 } }] },
  { name: "knowledge_shares", indexes: [{ key: { knowledgeId: 1 } }, { key: { recipientId: 1 } }] },
  { name: "onboarding", indexes: [{ key: { accountId: 1 }, unique: true }] },
  { name: "presences", indexes: [{ key: { id: 1 }, unique: true }] },
  { name: "prices", indexes: [{ key: { symbol: 1, timestamp: 1 }, unique: true }] },
  { name: "stats", indexes: [{ key: { entityId: 1, entityType: 1 }, unique: true }] },
  { name: "tags", indexes: [{ key: { id: 1 }, unique: true }] },
  {
    name: "visits",
    indexes: [{ key: { id: 1 }, unique: true }, { key: { fingerprintId: 1, timestamp: 1 } }],
  },
  { name: "skills", indexes: [{ key: { name: 1 }, unique: true }] },
];

/**
 * Test MongoDB connection
 */
async function testConnection() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("\n🔄 TESTING MONGODB CONNECTION");
    console.log(
      `Attempting to connect to MongoDB at: ${MONGODB_URI.replace(
        /\/\/([^:]+):([^@]+)@/,
        "//***:***@",
      )}`,
    );

    await client.connect();
    console.log("✅ Successfully connected to MongoDB");

    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();

    console.log(`\nDatabase: ${DB_NAME}`);
    console.log("Collections:");
    if (collections.length === 0) {
      console.log("  No collections found");
    } else {
      collections.forEach((collection) => {
        console.log(`  - ${collection.name}`);
      });
    }

    // Create a test document
    console.log("\nCreating a test document...");
    const testCollection = db.collection("test_connection");
    const result = await testCollection.insertOne({
      test: true,
      message: "MongoDB connection test successful",
      timestamp: new Date(),
    });

    console.log(`✅ Test document created with ID: ${result.insertedId}`);

    // Retrieve the document
    const retrievedDoc = await testCollection.findOne({ _id: result.insertedId });
    console.log("\nRetrieved test document:");
    console.log(retrievedDoc);

    // Clean up
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log("\n✅ Test document deleted");

    console.log("\n🎉 MongoDB connection test completed successfully");
    return true;
  } catch (error) {
    console.error("\n❌ MongoDB connection test failed:");
    console.error(error);
    return false;
  } finally {
    await client.close();
    console.log("\nMongoDB connection closed");
  }
}

/**
 * Setup required collections and indexes
 */
async function setupCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("\n🔄 SETTING UP MONGODB COLLECTIONS");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Get existing collections
    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map((c) => c.name);

    let createdCount = 0;
    let updatedCount = 0;

    // Create collections and indexes
    for (const config of COLLECTIONS_CONFIG) {
      // Create collection if it doesn't exist
      if (!existingCollectionNames.includes(config.name)) {
        console.log(`Creating collection: ${config.name}`);
        await db.createCollection(config.name);
        createdCount++;
      }

      // Create indexes
      if (config.indexes && config.indexes.length > 0) {
        const collection = db.collection(config.name);

        for (const indexDef of config.indexes) {
          console.log(`Creating index on ${config.name}: ${JSON.stringify(indexDef.key)}`);
          await collection.createIndex(indexDef.key, { unique: indexDef.unique || false });
          updatedCount++;
        }
      }
    }

    console.log(
      `\n✅ Setup complete: Created ${createdCount} collections, updated ${updatedCount} indexes`,
    );
    return true;
  } catch (error) {
    console.error("\n❌ Collection setup failed:");
    console.error(error);
    return false;
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

/**
 * Test capability service operations
 */
async function testCapabilityService() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("\n🧠 TESTING CAPABILITY SERVICE OPERATIONS");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const profilesCollection = db.collection("profiles");
    const capabilitiesCollection = db.collection("capabilities");

    // Create test data
    const testProfileId = "test-profile-" + Date.now();

    // 1. Create a test profile
    console.log("Creating a test profile...");
    const profile = {
      id: testProfileId,
      walletAddress: "0x" + "1".repeat(40),
      fingerprintId: "test-fingerprint-" + Date.now(),
      username: "test-user-" + Date.now(),
      bio: "Test profile for capability service testing",
      avatarUrl: "https://example.com/avatar.png",
      contactInfo: { email: "test@example.com" },
      preferences: { isProfilePublic: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await profilesCollection.insertOne(profile);
    console.log(`✅ Created test profile with ID: ${testProfileId}`);

    // 2. Create a capability
    console.log("Creating a test capability...");
    const capability = {
      profileId: testProfileId,
      name: "MongoDB JavaScript Development",
      level: "Advanced",
      type: "Technical",
      category: "Database",
      description: "Professional experience with MongoDB and JavaScript development",
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const capabilityResult = await capabilitiesCollection.insertOne(capability);
    const capabilityId = capabilityResult.insertedId;
    console.log(`✅ Created capability with ID: ${capabilityId}`);

    // 3. Get the capability
    console.log("Getting the capability...");
    const retrievedCapability = await capabilitiesCollection.findOne({ _id: capabilityId });
    console.log("Retrieved capability:", {
      name: retrievedCapability.name,
      level: retrievedCapability.level,
      type: retrievedCapability.type,
      isVerified: retrievedCapability.isVerified,
    });

    // 4. Update the capability
    console.log("Updating the capability...");
    await capabilitiesCollection.updateOne(
      { _id: capabilityId },
      {
        $set: {
          level: "Expert",
          description: "Expert-level MongoDB and JavaScript development with 5+ years experience",
          updatedAt: new Date(),
        },
      },
    );

    // 5. Get the updated capability
    const updatedCapability = await capabilitiesCollection.findOne({ _id: capabilityId });
    console.log("Updated capability:", {
      name: updatedCapability.name,
      level: updatedCapability.level,
      description: updatedCapability.description,
    });

    // 6. Get all capabilities for the profile
    console.log("Getting all capabilities for the profile...");
    const capabilities = await capabilitiesCollection.find({ profileId: testProfileId }).toArray();
    console.log(`✅ Found ${capabilities.length} capabilities for profile`);

    // 7. Delete the capability
    console.log("Deleting the capability...");
    await capabilitiesCollection.deleteOne({ _id: capabilityId });
    console.log("✅ Capability successfully deleted");

    // 8. Verify deletion
    const deletedCapability = await capabilitiesCollection.findOne({ _id: capabilityId });
    if (!deletedCapability) {
      console.log("✅ Verified capability was deleted");
    }

    // Clean up test data
    await profilesCollection.deleteOne({ id: testProfileId });
    console.log("✨ Test profile data cleaned up");

    console.log("🎉 Capability service operations tested successfully!");
    return true;
  } catch (error) {
    console.error("❌ Capability service test failed:", error);
    return false;
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

/**
 * Check MongoDB migration status
 */
async function checkMigrationStatus() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("\n🔄 CHECKING MONGODB MIGRATION STATUS");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Check 1: Connection
    console.log("\nCheck 1: Validating MongoDB connection...");
    console.log("✅ Connection successful");

    // Check 2: Required collections
    console.log("\nCheck 2: Checking for required collections...");
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const requiredCollections = COLLECTIONS_CONFIG.map((c) => c.name);
    const missingCollections = requiredCollections.filter(
      (name) => !collectionNames.includes(name),
    );

    if (missingCollections.length === 0) {
      console.log("✅ All required collections are present");
    } else {
      console.log("⚠️ Missing collections:");
      missingCollections.forEach((name) => console.log(`  - ${name}`));
    }

    // Check 3: Indexes
    console.log("\nCheck 3: Validating collection indexes...");
    let indexIssues = 0;

    for (const config of COLLECTIONS_CONFIG) {
      if (!collectionNames.includes(config.name)) {
        continue; // Skip collections that don't exist yet
      }

      const collection = db.collection(config.name);
      const indexes = await collection.indexes();

      for (const indexDef of config.indexes) {
        const key = Object.keys(indexDef.key)[0];
        const hasIndex = indexes.some((idx) => idx.key && key in idx.key);

        if (!hasIndex) {
          console.log(`⚠️ Missing index on ${config.name}: ${JSON.stringify(indexDef.key)}`);
          indexIssues++;
        }
      }
    }

    if (indexIssues === 0) {
      console.log("✅ All required indexes are present");
    }

    // Migration Summary
    const totalChecks = 3;
    const passedChecks =
      1 + // Connection always passes if we get here
      (missingCollections.length === 0 ? 1 : 0) +
      (indexIssues === 0 ? 1 : 0);

    const migrationPercentage = Math.round((passedChecks / totalChecks) * 100);

    console.log("\n📊 MIGRATION STATUS SUMMARY:");
    console.log(`✅ ${passedChecks} out of ${totalChecks} checks passed`);
    console.log(`📈 Migration is approximately ${migrationPercentage}% complete`);

    if (migrationPercentage === 100) {
      console.log("\n🎉 MongoDB migration is complete!");
    } else {
      console.log(
        "\n⚠️ MongoDB migration is incomplete. Run setup commands to complete the migration.",
      );
    }

    return {
      success: true,
      migrationPercentage,
      missingCollections,
      indexIssues,
    };
  } catch (error) {
    console.error("\n❌ Migration status check failed:");
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    await client.close();
    console.log("\nMongoDB connection closed");
  }
}

/**
 * Interactive CLI interface for MongoDB operations
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n🔄 MONGODB UTILITIES");
  console.log("\nAvailable operations:");
  console.log("1. Test MongoDB connection");
  console.log("2. Setup MongoDB collections and indexes");
  console.log("3. Run capability service test");
  console.log("4. Check migration status");
  console.log("5. Exit");

  rl.question("\nSelect an operation (1-5): ", async (answer) => {
    let result;

    switch (answer.trim()) {
      case "1":
        result = await testConnection();
        break;
      case "2":
        result = await setupCollections();
        break;
      case "3":
        result = await testCapabilityService();
        break;
      case "4":
        result = await checkMigrationStatus();
        break;
      case "5":
        console.log("Exiting...");
        rl.close();
        return;
      default:
        console.log("Invalid option. Please select a number from 1-5.");
        rl.close();
        main();
        return;
    }

    console.log("\nOperation completed with " + (result ? "success" : "errors") + ".");

    rl.question("\nWould you like to perform another operation? (y/n): ", (ans) => {
      if (ans.toLowerCase() === "y" || ans.toLowerCase() === "yes") {
        rl.close();
        main();
      } else {
        console.log("Exiting MongoDB Utilities");
        rl.close();
      }
    });
  });
}

// Command line arguments handling
if (process.argv.length > 2) {
  const command = process.argv[2];

  switch (command) {
    case "test-connection":
      testConnection().catch(console.error);
      break;
    case "setup-collections":
      setupCollections().catch(console.error);
      break;
    case "test-capability":
      testCapabilityService().catch(console.error);
      break;
    case "check-migration":
      checkMigrationStatus().catch(console.error);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log(
        "Available commands: test-connection, setup-collections, test-capability, check-migration",
      );
      break;
  }
} else {
  // Run interactive mode
  main().catch(console.error);
}

module.exports = {
  testConnection,
  setupCollections,
  testCapabilityService,
  checkMigrationStatus,
};
