#!/usr/bin/env node

/**
 * MongoDB-based Argos Server Deployment Script
 *
 * This script handles deployment of the MongoDB-based Argos server.
 * It replaces the Firebase deployment process previously used.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Configuration
const CONFIG = {
  projectRoot: path.resolve(__dirname, "../"),
  buildCommand: "npm run build",
  port: process.env.PORT || 3000,
  deployTarget: process.env.DEPLOY_TARGET || "development",
};

// Process command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const target = args.find((arg) => !arg.startsWith("--")) || CONFIG.deployTarget;

console.log(`🚀 Deploying Argos Server to ${target}${isDryRun ? " (DRY RUN)" : ""}`);

try {
  // Change to project root
  process.chdir(CONFIG.projectRoot);

  // Build the project
  console.log("\n📦 Building project...");
  if (!isDryRun) {
    execSync(CONFIG.buildCommand, { stdio: "inherit" });
  } else {
    console.log(`[DRY RUN] Would execute: ${CONFIG.buildCommand}`);
  }

  // Check for MongoDB connection
  console.log("\n🔍 Verifying MongoDB connection...");
  if (!isDryRun) {
    try {
      execSync("node scripts/mongodb-utils.js test-connection", { stdio: "inherit" });
    } catch (error) {
      console.error("❌ MongoDB connection verification failed. Deployment aborted.");
      process.exit(1);
    }
  } else {
    console.log("[DRY RUN] Would verify MongoDB connection");
  }

  // Setup collections and indexes
  console.log("\n🗂️ Setting up MongoDB collections and indexes...");
  if (!isDryRun) {
    execSync("node scripts/mongodb-utils.js setup-collections", { stdio: "inherit" });
  } else {
    console.log("[DRY RUN] Would setup MongoDB collections and indexes");
  }

  // Deployment logic based on target
  console.log(`\n🚀 Deploying to ${target}...`);

  switch (target) {
    case "development":
      // For development, just start the server locally
      if (!isDryRun) {
        console.log(`Starting server on port ${CONFIG.port}...`);
        execSync(`PORT=${CONFIG.port} node lib/index.js`, { stdio: "inherit" });
      } else {
        console.log(`[DRY RUN] Would start server on port ${CONFIG.port}`);
      }
      break;

    case "production":
      // For production, we would use whatever deployment mechanism is preferred
      // This could be Docker, PM2, or a cloud service
      if (!isDryRun) {
        console.log("Executing production deployment steps...");
        // Example: Deploy to cloud
        // execSync('terraform apply -auto-approve', { stdio: 'inherit' });
        console.log("⚠️ Production deployment not yet implemented");
      } else {
        console.log("[DRY RUN] Would execute production deployment steps");
      }
      break;

    default:
      console.log(`⚠️ Unknown deployment target: ${target}`);
      break;
  }

  console.log("\n✅ Deployment process completed successfully!");
} catch (error) {
  console.error("\n❌ Deployment failed:", error.message);
  process.exit(1);
}
