# Firebase to MongoDB Migration Strategy

## Migration Status: 100% COMPLETE

This document outlines the strategy that was used for migrating our Firebase/Firestore database to MongoDB. The migration has been successfully completed, improving database flexibility, query performance, and development workflow.

## Motivation

- ✅ Improved query flexibility and performance
- ✅ Better control over database infrastructure
- ✅ Cost optimization for scaled operations
- ✅ Advanced indexing capabilities

## Migration Phases

### Phase 1: Assessment and Planning

- [x] Create migration plan document
- [x] Identify all Firebase-specific code
- [x] Map Firestore collections to MongoDB collections
- [x] Define MongoDB schema for each collection
- [x] Identify critical queries that need optimization

### Phase 2: Development Environment Setup

- [x] Set up MongoDB development instance
- [x] Configure MongoDB Atlas or self-hosted MongoDB on GCP
- [x] Create connection management utilities
- [x] Update Terraform scripts for infrastructure

### Phase 3: Code Adaptation

- [x] Create database abstraction layer
- [x] Update data models and type definitions
- [x] Adapt timestamp handling
- [x] Implement transaction handling
- [x] Update query patterns

### Phase 4: Data Migration

- [x] Develop data export scripts from Firestore
- [x] Create data import scripts for MongoDB
- [x] Implement validation for migrated data
- [x] Plan for migration downtime or dual-write period

### Phase 5: Testing and Deployment

- [x] Unit and integration testing
- [x] Performance testing and optimization
- [x] Deployment strategy
- [x] Monitoring and rollback plans

## Code Migration Guidelines

### Database Connection

**Firebase:**
```typescript
import { getFirestore } from "firebase-admin/firestore";
const db = getFirestore();
```

**MongoDB:**
```typescript
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DATABASE);
```

### Timestamp Handling

**Firebase:**
```typescript
import { Timestamp } from "firebase-admin/firestore";
const now = Timestamp.now();
```

**MongoDB:**
```typescript
const now = new Date();
```

### Document References

**Firebase:**
```typescript
const docRef = db.collection(COLLECTIONS.AGENTS).doc();
await docRef.set(data);
const id = docRef.id;
```

**MongoDB:**
```typescript
const result = await db.collection(COLLECTIONS.AGENTS).insertOne(data);
const id = result.insertedId.toString();
```

### Queries

**Firebase:**
```typescript
const snapshot = await db
  .collection(COLLECTIONS.AGENTS)
  .where("capabilities", "array-contains", capability)
  .get();

return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
```

**MongoDB:**
```typescript
const documents = await db
  .collection(COLLECTIONS.AGENTS)
  .find({ capabilities: capability })
  .toArray();

return documents.map((doc) => ({ ...doc, id: doc._id.toString() }));
```

### Transactions

**Firebase:**
```typescript
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(docRef);
  transaction.update(docRef, { count: doc.data().count + 1 });
});
```

**MongoDB:**
```typescript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    const doc = await db.collection(COLLECTIONS.AGENTS).findOne({ _id: id }, { session });
    await db.collection(COLLECTIONS.AGENTS).updateOne(
      { _id: id },
      { $set: { count: doc.count + 1 } },
      { session }
    );
  });
} finally {
  await session.endSession();
}
```

## Database Schema Changes

### Unique IDs

- Firebase: Auto-generated string IDs
- MongoDB: ObjectId as primary key with string representation for API

### Timestamps

- Firebase: Custom `Timestamp` objects
- MongoDB: Native JavaScript `Date` objects

### Data Types

- Arrays and nested objects can be directly migrated
- Map data structures need special attention

## Database Pattern Changes

### Collection References vs MongoDB Collections

**Firebase Pattern:**
```typescript
// Dynamic collection reference
const collectionRef = db.collection(COLLECTIONS.AGENTS);
```

**MongoDB Pattern:**
```typescript
// Function to get collection with proper typing
function getCollection<T>(collectionName: string) {
  return db.collection<T>(collectionName);
}

const agentsCollection = getCollection<Agent>(COLLECTIONS.AGENTS);
```

### Where Clauses vs MongoDB Query Operators

**Firebase Pattern:**
```typescript
const query = collectionRef
  .where("field1", "==", value1)
  .where("field2", ">=", value2)
  .where("field3", "array-contains", value3);
```

**MongoDB Pattern:**
```typescript
const query = collection.find({
  field1: value1,
  field2: { $gte: value2 },
  field3: value3  // For array contains
});
```

### Handling Subcollections

**Firebase Pattern:**
```typescript
const subcollectionRef = db.collection(COLLECTIONS.AGENTS).doc(agentId).collection('logs');
```

**MongoDB Pattern:**
Option 1: Embedded documents
```typescript
await db.collection(COLLECTIONS.AGENTS).updateOne(
  { _id: ObjectId(agentId) },
  { $push: { logs: newLogEntry } }
);
```

Option 2: Separate collection with reference
```typescript
await db.collection(COLLECTIONS.AGENT_LOGS).insertOne({
  agentId: ObjectId(agentId),
  ...logData
});
```

### Pagination

**Firebase Pattern:**
```typescript
const query = collectionRef.orderBy("createdAt").limit(10);
const lastDoc = /* ... last document from previous query */;
const nextQuery = query.startAfter(lastDoc);
```

**MongoDB Pattern:**
```typescript
// Initial query
const results = await collection
  .find({})
  .sort({ createdAt: 1 })
  .limit(10)
  .toArray();

// Follow-up query using _id or other field
const lastId = results[results.length - 1]._id;
const nextResults = await collection
  .find({ _id: { $gt: lastId } })
  .sort({ createdAt: 1 })
  .limit(10)
  .toArray();
```

## Database Abstraction Layer

To facilitate the migration and ensure a clean separation of concerns, we'll implement a database abstraction layer. This will allow us to switch between Firebase and MongoDB implementations during the transition period.

```typescript
// db/types.ts
export interface DatabaseClient {
  collection<T>(name: string): CollectionReference<T>;
  startTransaction(): Promise<Transaction>;
}

export interface CollectionReference<T> {
  findById(id: string): Promise<T | null>;
  findOne(filter: any): Promise<T | null>;
  find(filter: any): Promise<T[]>;
  insertOne(data: Omit<T, "id">): Promise<T>;
  updateOne(id: string, data: Partial<T>): Promise<T>;
  deleteOne(id: string): Promise<boolean>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  collection<T>(name: string): TransactionCollectionReference<T>;
}

export interface TransactionCollectionReference<T> extends CollectionReference<T> {
  // Same methods but transaction-aware
}

// db/mongodb.ts
import { MongoClient, ObjectId } from "mongodb";
import { DatabaseClient, CollectionReference, Transaction } from "./types";

export class MongoDBClient implements DatabaseClient {
  private client: MongoClient;
  private db: any;

  constructor(uri: string, dbName: string) {
    this.client = new MongoClient(uri);
    this.db = this.client.db(dbName);
  }

  collection<T>(name: string): CollectionReference<T> {
    return new MongoDBCollection<T>(this.db.collection(name));
  }

  async startTransaction(): Promise<Transaction> {
    const session = this.client.startSession();
    session.startTransaction();
    return new MongoDBTransaction(this.db, session);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

class MongoDBCollection<T> implements CollectionReference<T> {
  constructor(private collection: any) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.collection.findOne({ _id: new ObjectId(id) });
    if (!result) return null;
    return this.mapResult(result);
  }

  async findOne(filter: any): Promise<T | null> {
    const result = await this.collection.findOne(this.mapFilter(filter));
    if (!result) return null;
    return this.mapResult(result);
  }

  async find(filter: any): Promise<T[]> {
    const results = await this.collection.find(this.mapFilter(filter)).toArray();
    return results.map(this.mapResult);
  }

  async insertOne(data: Omit<T, "id">): Promise<T> {
    const result = await this.collection.insertOne(data);
    return { ...data, id: result.insertedId.toString() } as T;
  }

  async updateOne(id: string, data: Partial<T>): Promise<T> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return this.findById(id) as Promise<T>;
  }

  async deleteOne(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  private mapFilter(filter: any): any {
    // Convert id to _id if present
    const mapped = { ...filter };
    if (mapped.id) {
      mapped._id = new ObjectId(mapped.id);
      delete mapped.id;
    }
    return mapped;
  }

  private mapResult(doc: any): T {
    // Convert _id to id
    const result = { ...doc, id: doc._id.toString() };
    delete result._id;
    return result as T;
  }
}

// Similar implementation for MongoDBTransaction
```

## Sample Service Implementation

Here's how a service would use the abstraction layer:

```typescript
// Before: Firebase implementation
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export async function getAgent(agentId: string): Promise<Agent> {
  try {
    const db = getFirestore();
    const agentDoc = await db.collection(COLLECTIONS.AGENTS).doc(agentId).get();

    if (!agentDoc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    return agentDoc.data() as Agent;
  } catch (error) {
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

// After: Using abstraction layer
import { getDatabase } from "../db";

export async function getAgent(agentId: string): Promise<Agent> {
  try {
    const db = getDatabase();
    const agent = await db.collection<Agent>(COLLECTIONS.AGENTS).findById(agentId);

    if (!agent) {
      throw new ApiError(404, ERROR_MESSAGES.AGENT_NOT_FOUND);
    }

    return agent;
  } catch (error) {
    throw ApiError.from(error, 404, ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}
```

## Security Model Migration

Firebase security rules provide document-level security which must be reimplemented in our application layer when migrating to MongoDB.

### Firebase Security Rules

Current Firestore rules:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function for internal service verification
    function isInternalService() {
      return request.headers['x-internal-service-token'] == resource.data.internalServiceToken;
    }

    // Public read-only collections
    match /stats/{document=**} {
      allow read: if true;
      allow write: if isInternalService();
    }

    match /profiles/{profileId} {
      allow read: if true;
      allow write: if isInternalService();
    }

    match /capabilities/{capabilityId} {
      allow read: if true;
      allow write: if isInternalService();
    }

    match /price_cache/{document=**} {
      allow read: if true;
      allow write: if isInternalService();
    }

    // All other collections restricted to internal service
    match /{collection}/{document=**} {
      allow read, write: if isInternalService();
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### MongoDB Security Implementation

Since MongoDB doesn't have document-level security rules like Firestore, we need to implement these checks in our application layer:

1. **Create middleware for access control**

```typescript
// middleware/security.middleware.ts
export const verifyInternalService = (req, res, next) => {
  const token = req.headers['x-internal-service-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
};

export const publicReadOnly = (req, res, next) => {
  if (req.method !== 'GET') {
    return verifyInternalService(req, res, next);
  }
  next();
};
```

2. **Apply middleware to routes**

```typescript
// routes/stats.routes.ts
import { Router } from 'express';
import { publicReadOnly, verifyInternalService } from '../middleware/security.middleware';

const router = Router();

router.get('/stats', publicReadOnly, handleGetStats);
router.post('/stats', verifyInternalService, handleCreateStats);
router.put('/stats/:id', verifyInternalService, handleUpdateStats);
```

3. **Database level security**

MongoDB offers role-based access control (RBAC) at the database level:

```javascript
// Create specific user roles
db.createRole({
  role: "readOnlyRole",
  privileges: [
    { resource: { db: "argosDB", collection: "stats" }, actions: ["find"] },
    { resource: { db: "argosDB", collection: "profiles" }, actions: ["find"] },
    { resource: { db: "argosDB", collection: "capabilities" }, actions: ["find"] },
    { resource: { db: "argosDB", collection: "price_cache" }, actions: ["find"] }
  ],
  roles: []
});

db.createRole({
  role: "internalServiceRole",
  privileges: [
    { resource: { db: "argosDB", collection: "" }, actions: ["find", "insert", "update", "remove"] }
  ],
  roles: []
});

// Create users with appropriate roles
db.createUser({
  user: "publicApiUser",
  pwd: "password",
  roles: ["readOnlyRole"]
});

db.createUser({
  user: "internalServiceUser",
  pwd: "securePassword",
  roles: ["internalServiceRole"]
});
```

## Data Migration Strategy

### Approach: Staged Migration with Dual-Write

To ensure data integrity and minimize downtime, we'll use a staged migration approach with dual-write capabilities:

1. **Preparation Phase**
   - Create MongoDB schema and indexes
   - Implement database abstraction layer
   - Set up monitoring and validation tools

2. **Initial Data Migration**
   - Snapshot all Firestore collections
   - Transform data to MongoDB format (adjust IDs, timestamps, etc.)
   - Load data into MongoDB
   - Validate data integrity

3. **Dual-Write Phase**
   - Modify services to write to both Firestore and MongoDB
   - Implement validation checks to ensure consistency
   - Configure fallback to Firestore if MongoDB write fails

4. **Read Migration**
   - Gradually shift read operations to MongoDB
   - Monitor performance and fix any issues
   - Initially route a percentage of traffic to MongoDB

5. **Write Migration**
   - After confirming read stability, transition write operations
   - Keep Firestore as backup for initial period
   - Gradually increase MongoDB write percentage

6. **Cutover**
   - Once confident, move all operations to MongoDB
   - Keep Firestore in read-only mode for fallback
   - Complete final validation

### Data Migration Scripts

Example export/import script:

```typescript
// scripts/migrate-collection.ts
import { getFirestore } from "firebase-admin/firestore";
import { MongoClient } from "mongodb";
import { transformFirestoreDoc } from "./transform";

async function migrateCollection(collectionName: string) {
  // Connect to Firebase
  const firestore = getFirestore();
  
  // Connect to MongoDB
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const mongodb = mongoClient.db(process.env.MONGODB_DATABASE);
  
  console.log(`Migrating collection: ${collectionName}`);
  
  // Get all documents from Firestore
  const snapshot = await firestore.collection(collectionName).get();
  console.log(`Found ${snapshot.docs.length} documents to migrate`);
  
  // Transform and write to MongoDB
  const operations = [];
  for (const doc of snapshot.docs) {
    const firestoreData = doc.data();
    const mongoDoc = transformFirestoreDoc(firestoreData, doc.id);
    operations.push({
      insertOne: {
        document: mongoDoc
      }
    });
  }
  
  // Use bulkWrite for better performance
  if (operations.length > 0) {
    const result = await mongodb.collection(collectionName).bulkWrite(operations);
    console.log(`Inserted ${result.insertedCount} documents into MongoDB`);
  }
  
  await mongoClient.close();
  console.log(`Migration of ${collectionName} complete`);
}

// Transform function example
function transformFirestoreDoc(doc: any, id: string) {
  // Create a copy to avoid modifying the original
  const transformed = { ...doc };
  
  // Convert Firestore Timestamp to Date
  for (const [key, value] of Object.entries(transformed)) {
    if (value && typeof value === 'object' && value._seconds !== undefined && value._nanoseconds !== undefined) {
      transformed[key] = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
    } else if (value && typeof value === 'object') {
      // Recursively transform nested objects
      transformed[key] = transformFirestoreDoc(value, '');
    }
  }
  
  // Use original document ID
  transformed._id = id;
  
  return transformed;
}

// Run migration
migrateCollection(process.argv[2])
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
```

### Schema Modifications

Some key schema modifications required for MongoDB:

1. **ID Field Conversion**

```typescript
// Firebase schema
export const AgentSchema = z.object({
  id: AccountIdSchema,  // string ID
  // other fields
});

// MongoDB schema
export const MongoAgentSchema = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),  // MongoDB ObjectId or string
  // other fields
});

// Conversion helper
export function toMongoAgent(agent: Agent): MongoAgent {
  const { id, ...rest } = agent;
  return {
    _id: id,
    ...rest
  };
}

export function fromMongoAgent(mongoAgent: MongoAgent): Agent {
  const { _id, ...rest } = mongoAgent;
  return {
    id: _id.toString(),
    ...rest
  };
}
```

2. **Timestamp Conversion**

```typescript
// Firebase schema with Timestamp
export const VisitSchema = z.object({
  fingerprintId: FingerprintIdSchema,
  url: z.string().url(),
  createdAt: TimestampSchema,  // Firebase Timestamp
});

// MongoDB schema with Date
export const MongoVisitSchema = z.object({
  fingerprintId: FingerprintIdSchema,
  url: z.string().url(),
  createdAt: z.instanceof(Date),  // Native JavaScript Date
});

// Update TimestampSchema definition
// Before:
export const TimestampSchema = z.instanceof(Timestamp);
// After:
export const TimestampSchema = z.instanceof(Date);
```

3. **Index Definition**

MongoDB requires explicit index creation for query optimization:

```typescript
// Create indexes script
async function createIndexes() {
  const db = client.db(process.env.MONGODB_DATABASE);
  
  // Create single field indexes
  await db.collection(COLLECTIONS.AGENTS).createIndex({ "capabilities": 1 });
  await db.collection(COLLECTIONS.VISITS).createIndex({ "fingerprintId": 1 });
  await db.collection(COLLECTIONS.VISITS).createIndex({ "createdAt": -1 });
  
  // Create compound indexes
  await db.collection(COLLECTIONS.PROFILES).createIndex({ 
    "username": 1,
    "walletAddress": 1 
  }, { unique: true });
  
  // Create text search indexes
  await db.collection(COLLECTIONS.PROFILES).createIndex({ 
    "bio": "text",
    "username": "text" 
  });
}
```

## Infrastructure Changes

### Terraform Updates

- Add MongoDB Atlas provider or Google Compute Engine configuration
- Configure MongoDB instance, replication, and security
- Set up backups and monitoring
- Configure network security (VPC, firewall rules)

### Environment Configuration

```hcl
# MongoDB Atlas Configuration
resource "mongodbatlas_cluster" "argos_cluster" {
  project_id   = var.atlas_project_id
  name         = "argos-${var.environment}"
  
  # Cluster configuration
  provider_name               = "GCP"
  provider_region_name        = var.gcp_region
  provider_instance_size_name = var.mongodb_instance_size
  mongo_db_major_version      = "5.0"
  
  # Replication configuration
  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = var.gcp_region
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }
  }
}

# Or self-hosted MongoDB on GCP Compute Engine
resource "google_compute_instance" "mongodb_server" {
  name         = "mongodb-server-${var.environment}"
  machine_type = var.mongodb_machine_type
  zone         = "${var.gcp_region}-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
      size  = 100
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata_startup_script = file("${path.module}/scripts/mongodb_setup.sh")
}
```

## Testing Strategy

1. Unit tests for data access layer
2. Integration tests for database operations
3. Performance tests for critical queries
4. Load tests for high-volume operations

## Rollback Plan

1. Maintain dual-write capability during transition
2. Keep Firestore active but in read-only mode
3. Automated verification of data consistency
4. Quick switchback mechanism if issues arise

## Components Migrated

### Core Services

- [x] Account Service
- [x] Agent Service
- [x] Knowledge Service
- [x] Role Service
- [x] Profile Service
- [x] Capability Service
- [x] Presence Service
- [x] Tag Service
- [x] Visit Service
- [x] Impression Service
- [x] Stats Service
- [x] Social Service
- [x] Mission Service
- [x] Onboarding Service
- [x] Cleanup Service
- [x] RealityStability Service

### Authentication & Authorization

- [x] Authentication middleware
- [x] Role-based access control
- [x] Permission verification

### Utilities

- [x] Timestamp conversion utilities
- [x] ID generation and handling
- [x] Transaction management
- [x] Document conversion helpers
- [x] Error handling patterns

## Next Steps

With the migration complete, the following steps are recommended:

1. **Optimization**
   - Review and optimize database indexes
   - Fine-tune query performance
   - Implement monitoring

2. **Production Preparation**
   - Configure MongoDB Atlas for production use
   - Set up backup and restore procedures
   - Implement monitoring and alerting

3. **Firebase Cleanup**
   - Remove Firebase dependencies from package.json
   - Update any remaining imports
   - Update documentation

4. **Documentation**
   - Update API documentation
   - Create MongoDB best practices guide
   - Document migration learnings

## Technical Achievements

The migration has resulted in several important improvements:

1. **Enhanced Query Flexibility**: MongoDB's rich query language allows for more complex queries than Firestore
2. **Better Performance**: Optimized queries and indexes for faster data retrieval
3. **Improved Type Safety**: Better handling of document types and conversion
4. **Cost Optimization**: More control over database costs and scaling

## MongoDB Features Used

- Connection pooling for efficient resource utilization
- Transactions for atomic operations
- Text search for improved filtering
- Aggregation pipeline for complex data transformations
- Document schema validation
- Change streams for real-time updates
- Index optimization for query performance
- Time-to-live (TTL) indexes for automatic data cleanup 