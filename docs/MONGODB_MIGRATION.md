# MongoDB Migration Guide

## Overview
This document outlines the migration from Firebase/Firestore to MongoDB in the Argos Server application. It provides guidance on best practices, patterns, and utilities for working with MongoDB effectively.

## Migration Changes

### Data Model Changes
- **Document IDs**: Changed from Firestore string IDs to MongoDB ObjectIds
- **Timestamps**: Changed from Firestore Timestamps to native JavaScript Date objects
- **References**: Changed from Firestore document references to string IDs or ObjectIds
- **Sub-collections**: Replaced with embedded documents or separate collections with reference fields

### Architecture Changes
- **Database Access**: Centralized through utility functions in `mongodb.ts`
- **Transactions**: Using MongoDB sessions instead of Firestore transactions
- **Queries**: Using MongoDB Query Language instead of Firestore queries
- **Filters**: Using helper functions like `idFilter` instead of direct document references

## MongoDB Utilities

### Connection Management
```typescript
// Get the MongoDB client instance
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

// Get the MongoDB database instance
export async function getDb(): Promise<Db> {
  if (!db) {
    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DATABASE || "argosDB";
    db = client.db(dbName);
  }
  return db;
}
```

### Filter Creation
```typescript
// Create a filter for MongoDB ObjectId
export const idFilter = (id: string | null | undefined): Filter<any> => {
  if (!id) return {};
  
  try {
    return { _id: new ObjectId(id) };
  } catch (error) {
    console.warn(`Invalid ObjectId format: ${id}`);
    return {};
  }
};

// Create a filter for string ID fields
export function stringIdFilter(field: string, id: string): Filter<any> {
  if (!id) return {};
  return { [field]: id };
}
```

### Session/Transaction Management
```typescript
// Start a MongoDB session with transaction
export async function startMongoSession(): Promise<ClientSession> {
  const client = await getMongoClient();
  const session = client.startSession();
  session.startTransaction();
  return session;
}

// Commit a MongoDB transaction
export async function commitTransaction(session: ClientSession): Promise<void> {
  if (!session) return;
  await session.commitTransaction();
  await session.endSession();
}

// Abort a MongoDB transaction
export async function abortTransaction(session: ClientSession): Promise<void> {
  if (!session) return;
  await session.abortTransaction();
  await session.endSession();
}

// Execute a function within a MongoDB transaction
export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await startMongoSession();
  try {
    const result = await callback(session);
    await commitTransaction(session);
    return result;
  } catch (error) {
    await abortTransaction(session);
    throw error;
  }
}
```

### Document Formatting
```typescript
// Format a MongoDB document with proper typing
export function formatDocument<T>(doc: Record<string, any> | null): T | null {
  if (!doc) return null;
  
  const { _id, ...rest } = doc;
  return {
    id: _id.toString(),
    ...processDocumentFromMongoDB(rest),
  } as T;
}

// Format an array of MongoDB documents
export function formatDocuments<T>(docs: Record<string, any>[] | null | undefined): T[] {
  if (!docs) return [];
  return docs.map(doc => formatDocument<T>(doc)!).filter(Boolean);
}
```

### Timestamp Handling
```typescript
// Convert a timestamp to milliseconds
export function toMillis(timestamp: Date | number | string | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined) return null;
  
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date.getTime();
  }
  
  return null;
}

// Get the current server timestamp
export function serverTimestamp(): Date {
  return new Date();
}
```

## Best Practices

### MongoDB Filter Pattern

Use the safe filter utilities instead of directly creating ObjectIds:

```typescript
// ❌ AVOID
const doc = await collection.findOne({ _id: new ObjectId(id) });

// ✅ USE
const filter = idFilter(id);
if (!Object.keys(filter).length) {
  throw new ApiError(404, ERROR_MESSAGES.ENTITY_NOT_FOUND);
}
const doc = await collection.findOne(filter);
```

### MongoDB Sessions

Use the session utilities instead of directly accessing client:

```typescript
// ❌ AVOID
const session = db.client.startSession();

// ✅ USE
const session = await startMongoSession();
```

### Timestamp Handling

Date objects don't have toMillis() method. Use the timestamp utilities:

```typescript
// ❌ AVOID
const ms = date.toMillis();

// ✅ USE
const ms = toMillis(date);
```

### Error Handling

Wrap MongoDB errors with the API error class:

```typescript
try {
  const result = await db.collection(COLLECTIONS.ACCOUNTS).insertOne(account);
  return { id: result.insertedId.toString(), ...account };
} catch (error) {
  console.error(`${LOG_PREFIX} Error creating account:`, error);
  throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_CREATE_ACCOUNT);
}
```

### Document Formatting

Always format documents from MongoDB to ensure consistent types:

```typescript
const accountDoc = await db.collection(COLLECTIONS.ACCOUNTS).findOne(filter);
return formatDocument<Account>(accountDoc);
```

### Multi-Document Operations

Use transactions for operations that affect multiple documents:

```typescript
const result = await withTransaction(async (session) => {
  // Insert the profile document
  const profileResult = await profileCollection.insertOne(profile, { session });
  const profileId = profileResult.insertedId.toString();
  
  // Create stats document
  const stats = {
    profileId,
    missionsCompleted: 0,
    successRate: 0,
    totalRewards: 0,
    reputation: 0,
    joinedAt: now,
    lastActive: now,
    createdAt: now,
    updatedAt: now,
  };
  
  // Insert stats with the same ID as the profile for easier reference
  await statsCollection.insertOne({ ...stats, _id: new ObjectId(profileId) }, { session });
  
  // Return result with the created ID
  return {
    ...profile,
    id: profileId,
  };
});
```

## MongoDB Collections

The following collections are defined in the system:

```typescript
export const COLLECTIONS = {
  FINGERPRINTS: "fingerprints",
  API_KEYS: "api-keys",
  VISITS: "visits",
  PRESENCE: "presence",
  RATE_LIMITS: "rate-limits",
  RATE_LIMIT_STATS: "rate-limit-stats",
  TAG_RULES: "tag-rules",
  TAG_STATS: "tag-stats",
  TAG_EVENTS: "tag-events",
  TAG_EVENT_VISITS: "tag-event-visits",
  PRICE_CACHE: "price-cache",
  SITES: "sites",
  IMPRESSIONS: "impressions",
  PROFILES: "profiles",
  CAPABILITIES: "capabilities",
  STATS: "stats",
  STATS_HISTORY: "stats-history",
  ROLES: "roles",
  TAGS: "tags",
  SKILLS: "skills",
  PROFILE_CAPABILITIES: "profile-capabilities",
  ACCOUNTS: "accounts",
  ANON_USERS: "anon-users",
  MISSIONS: "missions",
  ONBOARDING: "onboarding",
  AGENTS: "agents",
  AGENT_INVITES: "agent-invites",
  MISSION_LOGS: "mission-logs",
  MISSION_RESULTS: "mission-results",
  MISSION_ASSIGNMENTS: "mission-assignments",
  MISSION_TYPES: "mission-types",
  AGENT_LOGS: "agent-logs",
  KNOWLEDGE: "knowledge",
  KNOWLEDGE_SHARES: "knowledge-shares",
  KNOWLEDGE_TRANSFERS: "knowledge-transfers",
};
```

## Utility Types

MongoDB-specific utility types for TypeScript:

```typescript
// MongoDB ID filter
export type MongoIdFilter = { _id: ObjectId };

// MongoDB field filter
export type MongoFieldFilter<T> = { 
  [K in keyof T]?: T[K] | { $in: T[K][] } | { $nin: T[K][] } 
};

// MongoDB date range filter
export type MongoDateRangeFilter = {
  [key: string]: {
    $gte?: Date;
    $lte?: Date;
  };
};

// MongoDB text search filter
export type MongoTextSearchFilter = {
  $text: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
};

// MongoDB exists filter
export type MongoExistsFilter = {
  [key: string]: {
    $exists: boolean;
  };
};

// Combined MongoDB query type
export type MongoQuery<T> =
  | MongoIdFilter
  | MongoFieldFilter<T>
  | MongoDateRangeFilter
  | MongoTextSearchFilter
  | MongoExistsFilter
  | Filter<T>;
```

## Deployment Considerations

### MongoDB Connection URI

Set the MongoDB connection URI in the environment variables:

```
MONGODB_URI=mongodb://argosUser:password@localhost:27017/argosDB
MONGODB_DATABASE=argosDB
```

### MongoDB vs Firebase Admin SDK

The Firebase Admin SDK is still used for authentication, but all database operations have been migrated to MongoDB. This creates a hybrid approach where:

1. Authentication is handled by Firebase
2. Data storage and retrieval is handled by MongoDB
3. Transactions and complex queries use MongoDB capabilities

### Indexes

MongoDB indexes should be created for frequently queried fields:

```javascript
// Example indexes for important collections
db.accounts.createIndex({ "walletAddress": 1 }, { unique: true });
db.profiles.createIndex({ "walletAddress": 1 }, { unique: true });
db.agents.createIndex({ "state.status": 1 });
db.knowledge.createIndex({ "ownerId": 1 });
db.knowledge.createIndex({ "domain": 1 });
```

## Migration Scripts

For migrating existing data from Firestore to MongoDB, use the migration utilities in the `scripts` directory:

```javascript
// Example migration script
const { migrateCollection } = require('./migration-utils');

async function migrateAccounts() {
  await migrateCollection({
    sourceCollection: 'accounts',
    targetCollection: 'accounts',
    transform: (doc) => {
      // Transform Firestore document to MongoDB format
      const { id, ...data } = doc;
      return {
        _id: new ObjectId(), // Generate new ObjectId
        ...data,
        createdAt: new Date(data.createdAt._seconds * 1000),
        updatedAt: new Date(data.updatedAt._seconds * 1000),
      };
    }
  });
}
``` 