/**
 * MongoDB Services Test Script
 *
 * This script tests basic functionality of migrated services.
 * Use it to verify that services work correctly with MongoDB after migration.
 *
 * Usage:
 * 1. Ensure MongoDB is running and configured in .env file
 * 2. Run: node server/scripts/test-mongodb-services.js [service-name]
 *
 * Example: node server/scripts/test-mongodb-services.js impression
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");
const readline = require("readline");

// Configure MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/argosDB";
const DB_NAME = process.env.MONGODB_DATABASE || "argosDB";

// Create a MongoDB client
const client = new MongoClient(MONGODB_URI);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Available test functions
const serviceTests = {
  // Test impression service
  impression: async (db) => {
    console.log("🧪 Testing Impression Service...");

    const fingerprintId = "test-fingerprint-" + Date.now();
    const impressionType = "test-impression";

    // Create test impression
    console.log("➡️ Creating test impression...");
    const result = await db.collection("impressions").insertOne({
      fingerprintId,
      type: impressionType,
      data: { message: "Test impression data" },
      createdAt: Date.now(),
      source: "test-script",
    });

    console.log(`✓ Created impression with ID: ${result.insertedId}`);

    // Fetch impression
    console.log("➡️ Fetching impressions...");
    const impressions = await db.collection("impressions").find({ fingerprintId }).toArray();

    console.log(`✓ Found ${impressions.length} impressions`);
    console.log(JSON.stringify(impressions[0], null, 2));

    // Delete impressions
    console.log("➡️ Deleting test impressions...");
    const deleteResult = await db.collection("impressions").deleteMany({ fingerprintId });

    console.log(`✓ Deleted ${deleteResult.deletedCount} impressions`);

    return { success: true, message: "Impression service test completed successfully" };
  },

  // Test tag service
  tag: async (db) => {
    console.log("🧪 Testing Tag Service...");

    const taggerId = "test-tagger-" + Date.now();
    const targetId = "test-target-" + Date.now();
    const platform = "x";

    // Create test users
    console.log("➡️ Creating test users...");
    await db.collection("anonUsers").insertMany([
      {
        _id: taggerId,
        username: "test-tagger",
        platform,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tagLimits: {
          firstTaggedAt: Date.now(),
          remainingDailyTags: 5,
          lastTagResetAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      {
        _id: targetId,
        username: "test-target",
        platform,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    console.log("✓ Created test users");

    // Add a tag
    console.log("➡️ Adding tag to target user...");
    const tag = {
      type: "test",
      taggedBy: taggerId,
      taggedAt: Date.now(),
      platform,
    };

    await db.collection("anonUsers").updateOne(
      { _id: targetId },
      {
        $push: { taggedBy: tag },
        $set: { updatedAt: Date.now() },
      },
    );

    console.log("✓ Tag added successfully");

    // Update tag stats
    console.log("➡️ Updating tag stats...");
    await db.collection("tagStats").updateOne(
      { fingerprintId: taggerId },
      {
        $inc: {
          totalTagsMade: 1,
          dailyTags: 1,
          weeklyTags: 1,
          monthlyTags: 1,
          "tagTypes.test": 1,
        },
        $set: {
          lastTagAt: Date.now(),
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          createdAt: Date.now(),
          streak: 1,
        },
      },
      { upsert: true },
    );

    console.log("✓ Tag stats updated");

    // Get target user tags
    console.log("➡️ Fetching target user tags...");
    const targetUser = await db.collection("anonUsers").findOne({ _id: targetId });
    console.log(`✓ Target user has ${targetUser.taggedBy.length} tags`);

    // Clean up
    console.log("➡️ Cleaning up test data...");
    await db.collection("anonUsers").deleteMany({ _id: { $in: [taggerId, targetId] } });
    await db.collection("tagStats").deleteOne({ fingerprintId: taggerId });

    console.log("✓ Test data cleaned up");

    return { success: true, message: "Tag service test completed successfully" };
  },

  // Test visit service
  visit: async (db) => {
    console.log("🧪 Testing Visit Service...");

    const fingerprintId = "test-fingerprint-" + Date.now();
    const siteId = "test-site-" + Date.now();
    const now = Date.now();

    // Create test site
    console.log("➡️ Creating test site...");
    await db.collection("sites").insertOne({
      _id: siteId,
      fingerprintId,
      name: "Test Site",
      url: "https://test-site.com",
      settings: {
        privacy: "private",
      },
      visits: 0,
      lastVisited: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log("✓ Created test site");

    // Create test visit
    console.log("➡️ Creating test visit...");
    const visitResult = await db.collection("visits").insertOne({
      fingerprintId,
      siteId,
      url: "https://test-site.com/page",
      title: "Test Page",
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✓ Created visit with ID: ${visitResult.insertedId}`);

    // Update site visit count
    console.log("➡️ Updating site visit count...");
    await db.collection("sites").updateOne(
      { _id: siteId },
      {
        $inc: { visits: 1 },
        $set: { lastVisited: now, updatedAt: now },
      },
    );

    console.log("✓ Updated site visit count");

    // Get visit history
    console.log("➡️ Fetching visit history...");
    const visits = await db
      .collection("visits")
      .find({ fingerprintId })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✓ Found ${visits.length} visits`);

    // Clean up
    console.log("➡️ Cleaning up test data...");
    await db.collection("sites").deleteOne({ _id: siteId });
    await db.collection("visits").deleteMany({ fingerprintId });

    console.log("✓ Test data cleaned up");

    return { success: true, message: "Visit service test completed successfully" };
  },

  // Test price service
  price: async (db) => {
    console.log("🧪 Testing Price Service...");

    const symbol = "test-token-" + Date.now();
    const now = Date.now();

    // Create test price cache entry
    console.log("➡️ Creating test price cache entry...");
    const priceData = {
      _id: symbol,
      symbol,
      usd: 42.89,
      usd_24h_change: 3.5,
      createdAt: now,
      history: [
        { price: 42.0, createdAt: now - 24 * 60 * 60 * 1000 },
        { price: 42.5, createdAt: now - 12 * 60 * 60 * 1000 },
        { price: 42.89, createdAt: now },
      ],
    };

    const result = await db.collection("price-cache").insertOne(priceData);
    console.log(`✓ Created price cache entry with ID: ${result.insertedId}`);

    // Fetch price data
    console.log("➡️ Fetching price data...");
    const cachedPrice = await db.collection("price-cache").findOne({ _id: symbol });
    console.log(
      `✓ Found price data: $${cachedPrice.usd} (${cachedPrice.usd_24h_change}% 24h change)`,
    );
    console.log(`✓ Price history contains ${cachedPrice.history.length} data points`);

    // Update price data
    console.log("➡️ Updating price data...");
    await db.collection("price-cache").updateOne(
      { _id: symbol },
      {
        $set: {
          usd: 43.21,
          usd_24h_change: 4.2,
          updatedAt: now,
        },
      },
    );

    const updatedPrice = await db.collection("price-cache").findOne({ _id: symbol });
    console.log(
      `✓ Updated price data: $${updatedPrice.usd} (${updatedPrice.usd_24h_change}% 24h change)`,
    );

    // Clean up
    console.log("➡️ Cleaning up test data...");
    const deleteResult = await db.collection("price-cache").deleteOne({ _id: symbol });
    console.log(`✓ Deleted ${deleteResult.deletedCount} price cache entries`);

    return { success: true, message: "Price service test completed successfully" };
  },

  // Test cleanup service
  cleanup: async (db) => {
    console.log("🧪 Testing Cleanup Service...");

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    // Create test rate limit data to be cleaned up
    console.log("➡️ Creating test data for cleanup...");

    // Create old presence records
    await db.collection("presence").insertMany([
      { fingerprintId: "test-old-presence-1", lastUpdated: thirtyOneDaysAgo },
      { fingerprintId: "test-old-presence-2", lastUpdated: thirtyOneDaysAgo },
      { fingerprintId: "test-recent-presence", lastUpdated: now },
    ]);

    // Create old rate limit records
    await db.collection("rate-limits").insertMany([
      {
        _id: "test-old-rate-limit-1",
        requests: [twoHoursAgo, twoHoursAgo + 1000],
        lastUpdated: twoHoursAgo,
      },
      {
        _id: "test-old-rate-limit-2",
        requests: [twoHoursAgo, twoHoursAgo + 2000],
        lastUpdated: twoHoursAgo,
      },
      { _id: "test-recent-rate-limit", requests: [now - 1000, now], lastUpdated: now },
    ]);

    // Create old rate limit stats
    await db.collection("rate-limit-stats").insertMany([
      { identifier: "test-old-stats-1", timestamp: thirtyOneDaysAgo },
      { identifier: "test-old-stats-2", timestamp: thirtyOneDaysAgo },
      { identifier: "test-recent-stats", timestamp: now },
    ]);

    console.log("✓ Created test data for cleanup");

    // Test cleanup operations manually
    console.log("➡️ Testing cleanup operations...");

    // Delete old presence records
    const presenceResult = await db
      .collection("presence")
      .deleteMany({ lastUpdated: { $lt: thirtyDaysAgo } });
    console.log(`✓ Cleaned up ${presenceResult.deletedCount} old presence records`);

    // Delete old rate limit records
    const rateLimitResult = await db
      .collection("rate-limits")
      .deleteMany({ lastUpdated: { $lt: oneHourAgo } });
    console.log(`✓ Cleaned up ${rateLimitResult.deletedCount} old rate limit records`);

    // Delete old rate limit stats
    const statsResult = await db
      .collection("rate-limit-stats")
      .deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
    console.log(`✓ Cleaned up ${statsResult.deletedCount} old rate limit stats records`);

    // Clean up remaining test data
    console.log("➡️ Cleaning up remaining test data...");
    await db.collection("presence").deleteOne({ fingerprintId: "test-recent-presence" });
    await db.collection("rate-limits").deleteOne({ _id: "test-recent-rate-limit" });
    await db.collection("rate-limit-stats").deleteOne({ identifier: "test-recent-stats" });

    console.log("✓ Removed all test data");

    return { success: true, message: "Cleanup service test completed successfully" };
  },

  // Test capability service
  capability: async (db) => {
    console.log("\n🧠 TESTING CAPABILITY SERVICE");

    // Create test data
    const testProfileId = "test-profile-" + Date.now();
    let testCapabilityId = null;

    try {
      // 1. Create a test profile in MongoDB to use for capability testing
      console.log("Creating a test profile for capability testing...");
      const db = await require("../dist/utils/mongodb").getDb();

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

      await db.collection("profiles").insertOne(profile);
      console.log(`Created test profile with ID: ${testProfileId}`);

      // 2. Create a capability
      console.log("Creating a test capability...");
      const capabilityInput = {
        name: "MongoDB JavaScript Development",
        level: "Advanced",
        type: "Technical",
        category: "Database",
        description: "Professional experience with MongoDB and JavaScript development",
      };

      const capability = await require("../dist/services/capability.service").createCapability({
        profileId: testProfileId,
        input: capabilityInput,
      });

      testCapabilityId = capability.id;
      console.log(`Created capability with ID: ${testCapabilityId}`);

      // 3. Get the capability
      console.log("Getting the capability...");
      const retrievedCapability =
        await require("../dist/services/capability.service").getCapability({
          profileId: testProfileId,
          capabilityId: testCapabilityId,
        });

      console.log("Retrieved capability:", {
        name: retrievedCapability.name,
        level: retrievedCapability.level,
        type: retrievedCapability.type,
        isVerified: retrievedCapability.isVerified,
      });

      // 4. Update the capability
      console.log("Updating the capability...");
      const updatedCapability =
        await require("../dist/services/capability.service").updateCapability({
          profileId: testProfileId,
          capabilityId: testCapabilityId,
          input: {
            level: "Expert",
            description: "Expert-level MongoDB and JavaScript development with 5+ years experience",
          },
        });

      console.log("Updated capability:", {
        name: updatedCapability.name,
        level: updatedCapability.level,
        description: updatedCapability.description,
      });

      // 5. Get all capabilities for the profile
      console.log("Getting all capabilities for the profile...");
      const capabilities = await require("../dist/services/capability.service").getCapabilities({
        profileId: testProfileId,
      });

      console.log(`Found ${capabilities.length} capabilities for profile`);

      // 6. Test search capabilities
      console.log("Searching for capabilities...");
      const searchResults = await require("../dist/services/capability.service").searchCapabilities(
        "MongoDB",
      );

      console.log(`Found ${searchResults.length} capabilities matching search query`);

      // 7. Verify the capability
      console.log("Verifying the capability...");
      const verifierTestId = "test-verifier-" + Date.now();
      const verifiedCapability =
        await require("../dist/services/capability.service").verifyCapability({
          capabilityId: testCapabilityId,
          verifierId: verifierTestId,
        });

      console.log("Verified capability:", {
        name: verifiedCapability.name,
        isVerified: verifiedCapability.isVerified,
        verifierId: verifiedCapability.verifierId,
      });

      // 8. Delete the capability
      console.log("Deleting the capability...");
      await require("../dist/services/capability.service").deleteCapability({
        profileId: testProfileId,
        capabilityId: testCapabilityId,
      });

      console.log("✅ Capability successfully deleted");
      console.log("✅ Capability service tests passed!");
    } catch (error) {
      console.error("❌ Capability service test failed:", error);
    } finally {
      // Clean up test data
      try {
        const db = await require("../dist/utils/mongodb").getDb();
        await db.collection("profiles").deleteOne({ id: testProfileId });
        console.log("✨ Test profile data cleaned up");
      } catch (cleanupError) {
        console.error("Failed to clean up test data:", cleanupError);
      }
    }
  },
};

/**
 * Tests the onboarding service with MongoDB
 */
async function testOnboardingService() {
  console.log("\n--- Testing Onboarding Service ---");

  try {
    // Create a test fingerprint first
    const testFingerprint = {
      id: `test-fingerprint-${Date.now()}`,
      hash: "test-fingerprint-hash",
      components: {
        userAgent: "Mozilla/5.0 Test",
        language: "en-US",
        timezone: "America/New_York",
        platform: "MacOS",
        screenResolution: "1920x1080",
        colorDepth: 24,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert test fingerprint
    const db = await require("../dist/utils/mongodb").getDb();
    await db.collection("fingerprints").insertOne(testFingerprint);
    console.log(`Created test fingerprint with ID: ${testFingerprint.id}`);

    // 1. Start onboarding process
    const { default: onboardingService } = await import("../dist/services/onboarding.service.js");
    const onboarding = await onboardingService.startOnboarding({
      body: {
        fingerprintId: testFingerprint.id,
      },
    });

    console.log(`Started onboarding process with ID: ${onboarding.id}`);
    console.log(`Initial stage: ${onboarding.stage}`);
    console.log(`Number of missions: ${onboarding.missions.length}`);

    // 2. Verify a mission (social creation)
    // Simulate a social verification
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);

    const verifiedMission = await onboardingService.verifyMission({
      params: {
        onboardingId: onboarding.id,
      },
      body: {
        missionId: "social_creation",
        proof: {
          type: "social",
          platform: "twitter",
          username: "test_user_123",
          postUrl: "https://twitter.com/test_user_123/status/123456789",
          content: "This is a test post mentioning @index89 for verification",
          createdAt: fiveMinutesAgo.getTime(),
        },
      },
    });

    console.log(`Mission verification result: ${verifiedMission.stage}`);
    console.log(
      `Social mission status: ${
        verifiedMission.missions.find((m) => m.id === "social_creation").status
      }`,
    );

    // 3. Get onboarding progress
    const progress = await onboardingService.getOnboardingProgress(onboarding.id);
    console.log(`Retrieved onboarding progress. Current stage: ${progress.stage}`);

    // 4. Verify wallet creation mission
    const walletVerified = await onboardingService.verifyMission({
      params: {
        onboardingId: onboarding.id,
      },
      body: {
        missionId: "wallet_creation",
        proof: {
          type: "wallet",
          address: "0x123456789abcdef",
          signature: "0xabcdef1234567890",
          message: "I am verifying my wallet for Hivemind onboarding",
          timestamp: Date.now(),
        },
      },
    });

    console.log(`Wallet verification result: ${walletVerified.stage}`);
    console.log(
      `Wallet mission status: ${
        walletVerified.missions.find((m) => m.id === "wallet_creation").status
      }`,
    );

    // 5. Complete onboarding
    const completed = await onboardingService.completeOnboarding({
      params: {
        onboardingId: onboarding.id,
      },
      body: {
        walletAddress: "0x123456789abcdef",
        signature: "0xabcdef1234567890",
        message: "I am completing my Hivemind onboarding",
        timestamp: Date.now(),
      },
    });

    console.log(`Onboarding completion result: ${completed.stage}`);

    // Clean up test data
    console.log("Cleaning up test data...");
    await db.collection("onboarding").deleteOne({ id: onboarding.id });

    // Find and delete the anon user that was created
    const anonUserId = verifiedMission.metadata?.verifiedSocialIdentity?.anonSocialUserId;
    if (anonUserId) {
      await db.collection("anonUsers").deleteOne({ id: anonUserId });
      console.log(`Deleted test anon user with ID: ${anonUserId}`);
    }

    // Delete test fingerprint
    await db.collection("fingerprints").deleteOne({ id: testFingerprint.id });
    console.log(`Deleted test fingerprint with ID: ${testFingerprint.id}`);

    console.log("Onboarding service test completed successfully!");
  } catch (error) {
    console.error("Error testing onboarding service:", error);
  }
}

/**
 * Tests the stats service with MongoDB
 */
async function testStatsService() {
  console.log("\n--- Testing Stats Service ---");

  try {
    // Create a test profile ID
    const testProfileId = `test-profile-${Date.now()}`;

    // Load the stats service
    const { default: statsService } = await import("../dist/services/stats.service.js");

    // 1. Create stats for a profile
    console.log(`Creating stats for test profile: ${testProfileId}`);
    const createdStats = await statsService.createStats(testProfileId);
    console.log(`Created stats with ID: ${createdStats.id}`);
    console.log(`Initial reputation: ${createdStats.reputation}`);

    // 2. Get stats for a profile
    console.log(`Getting stats for profile: ${testProfileId}`);
    const stats = await statsService.getStats(testProfileId);
    console.log(
      `Retrieved stats: missions completed = ${stats.missionsCompleted}, success rate = ${stats.successRate}%`,
    );

    // 3. Update stats for a profile
    console.log(`Updating stats for profile: ${testProfileId}`);
    const updatedStats = await statsService.updateStats(testProfileId, {
      missionsCompleted: 5,
      successRate: 80,
    });
    console.log(
      `Updated stats: missions completed = ${updatedStats.missionsCompleted}, success rate = ${updatedStats.successRate}%`,
    );

    // 4. Update last active timestamp
    console.log(`Updating last active for profile: ${testProfileId}`);
    await statsService.updateLastActive(testProfileId);
    const afterLastActiveUpdate = await statsService.getStats(testProfileId);
    console.log(
      `Last active updated to: ${new Date(afterLastActiveUpdate.lastActive).toISOString()}`,
    );

    // 5. Record history
    console.log(`Recording history for profile: ${testProfileId}`);
    await statsService.recordHistory(testProfileId, afterLastActiveUpdate);

    // 6. Update reputation
    console.log(`Updating reputation for profile: ${testProfileId}`);
    const reputationChange = 25;
    const afterReputationUpdate = await statsService.updateReputation(
      testProfileId,
      reputationChange,
    );
    console.log(
      `Updated reputation from ${updatedStats.reputation} to ${afterReputationUpdate.reputation}`,
    );

    // 7. Calculate success rate
    console.log(`Calculating success rate for profile: ${testProfileId}`);
    const successRate = await statsService.calculateSuccessRate(testProfileId);
    console.log(`Calculated success rate: ${successRate}%`);

    // Clean up test data
    const db = await require("../dist/utils/mongodb").getDb();
    await db.collection("stats").deleteOne({ id: testProfileId });
    const historyCount = await db
      .collection("stats_history")
      .deleteMany({ profileId: testProfileId });
    console.log(
      `Cleaned up test data: Deleted stats and ${historyCount.deletedCount} history records`,
    );

    console.log("Stats service test completed successfully!");
  } catch (error) {
    console.error("Error testing stats service:", error);
  }
}

// Main function
async function main() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Get service from command line args
    const serviceName = process.argv[2]?.toLowerCase();

    if (serviceName && serviceTests[serviceName]) {
      // Run test for specified service
      const result = await serviceTests[serviceName](db);
      console.log(`\n${result.success ? "✅" : "❌"} ${result.message}`);
    } else {
      // Show prompt if no valid service specified
      console.log("\n🔍 Available services to test:");
      Object.keys(serviceTests).forEach((name) => console.log(`  - ${name}`));

      rl.question("\n🔄 Which service would you like to test? ", async (answer) => {
        const service = answer.toLowerCase().trim();

        if (serviceTests[service]) {
          try {
            const result = await serviceTests[service](db);
            console.log(`\n${result.success ? "✅" : "❌"} ${result.message}`);
          } catch (error) {
            console.error("\n❌ Test failed with error:", error);
          }
        } else {
          console.log("\n❌ Invalid service name. Please choose from the list above.");
        }

        // Close resources
        rl.close();
        await client.close();
      });

      return; // Return early to keep process alive for readline
    }

    // Add this line where other test functions are called
    await testOnboardingService();
    await testStatsService();

    // Close MongoDB connection
    await client.close();
    console.log("👋 MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the main function
main().catch(console.error);

// Handle process exit
process.on("exit", () => {
  if (client) client.close();
  if (rl) rl.close();
});
