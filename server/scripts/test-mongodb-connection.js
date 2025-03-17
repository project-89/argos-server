/**
 * MongoDB Connection Test Script
 *
 * This script tests the connection to MongoDB and verifies that basic CRUD operations work.
 * Run with: node test-mongodb-connection.js
 *
 * You must have a .env file in the server directory with MONGODB_URI and MONGODB_DATABASE values.
 */

require("dotenv").config({ path: "../.env" });
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/argosDB";
const DB_NAME = process.env.MONGODB_DATABASE || "argosDB";

async function testConnection() {
  console.log("Testing MongoDB connection...");
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
    console.log("✅ Successfully got database");

    // Test collection access
    const testCollection = db.collection("test_connection");
    console.log("✅ Successfully accessed test collection");

    // Test write operation
    const insertResult = await testCollection.insertOne({
      test: true,
      createdAt: new Date(),
      message: "Connection test",
    });
    console.log(`✅ Successfully inserted document with ID: ${insertResult.insertedId}`);

    // Test read operation
    const doc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log("✅ Successfully read document:", doc);

    // Test update operation
    const updateResult = await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { updated: true, updatedAt: new Date() } },
    );
    console.log(`✅ Successfully updated document. Modified: ${updateResult.modifiedCount}`);

    // Test read after update
    const updatedDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log("✅ Successfully read updated document:", updatedDoc);

    // Test delete operation
    const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log(`✅ Successfully deleted document. Deleted: ${deleteResult.deletedCount}`);

    // Test database collections
    const collections = await db.listCollections().toArray();
    console.log(
      "✅ Database collections:",
      collections.map((c) => c.name),
    );

    console.log("\n🎉 All MongoDB connection tests passed!");
  } catch (err) {
    console.error("❌ MongoDB connection test failed:", err);
  } finally {
    if (client) {
      await client.close();
      console.log("Connection closed");
    }
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
