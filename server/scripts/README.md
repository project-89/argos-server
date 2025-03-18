# MongoDB Utilities

This directory contains scripts for MongoDB operations:

## `mongodb-utils.js`

A comprehensive utility for MongoDB management, testing, and verification. It provides the following functionality:

### Features

- Test MongoDB connection
- Setup MongoDB collections and indexes
- Run capability service tests
- Check migration status

### Usage

Run the script in interactive mode:

```bash
npm run mongodb
```

Or run specific commands directly:

```bash
# Test connection
npm run mongodb:test

# Setup collections and indexes
npm run mongodb:setup

# Test capability service
npm run mongodb:capability

# Verify migration status
npm run mongodb:verify
```

### Command Line Arguments

When running the script directly, you can use these commands:

```bash
node scripts/mongodb-utils.js test-connection
node scripts/mongodb-utils.js setup-collections
node scripts/mongodb-utils.js test-capability
node scripts/mongodb-utils.js check-migration
```

## Configuration

The script reads from environment variables:

- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017/argosDB`)
- `MONGODB_DATABASE`: Database name (default: `argosDB`)

You can set these in your `.env` file. 