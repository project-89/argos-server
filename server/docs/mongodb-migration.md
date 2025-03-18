# MongoDB Migration Guide

This document outlines the patterns and best practices for working with MongoDB in our application after migration from Firestore.

## MongoDB Filter Pattern

Always use the provided utility functions instead of directly creating ObjectIds in MongoDB filters:

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

### Session Management

Never access `db.client` directly. Instead, use the provided session utilities:

```typescript
// ❌ INCORRECT - db.client is not available
const session = db.client.startSession();

// ✅ CORRECT - use the utility function
const session = await startMongoSession();
```

For complex transactions, consider using the `withTransaction` helper:

```typescript
await withTransaction(async (session) => {
  // Perform multiple operations within a transaction
  await collection1.insertOne(doc1, { session });
  await collection2.updateOne(filter, update, { session });
});
```

### Timestamp Handling

Firestore Timestamps are replaced with JavaScript Date objects:

```typescript
// ❌ INCORRECT - toMillis() doesn't exist on Date objects
const milliseconds = date.toMillis();

// ✅ CORRECT - use the timestamp utility
const milliseconds = toMillis(date);
```

## Error Handling

Always wrap MongoDB operations in try/catch blocks and use the ApiError class:

```typescript
try {
  // MongoDB operations
} catch (error) {
  console.error(`${LOG_PREFIX} Error details:`, error);
  throw ApiError.from(error, 500, ERROR_MESSAGES.SPECIFIC_ERROR_CONSTANT);
}
```

## Document Formatting

Use the provided formatting utilities to handle document transformation:

```typescript
// Converting MongoDB document to application model
return formatDocument<EntityType>(doc);

// Converting multiple documents
return formatDocuments<EntityType>(docs);
```

## Service Implementation Pattern

Follow this pattern when implementing service methods:

```typescript
export async function getEntityById(id: string): Promise<Entity | null> {
  try {
    console.log(`${LOG_PREFIX} Getting entity by ID:`, id);
    const db = await getDb();
    
    // Create filter with utility function
    const filter = idFilter(id);
    if (!filter) {
      return null;
    }
    
    // Find document
    const doc = await db.collection(COLLECTIONS.ENTITIES).findOne(filter);
    
    if (!doc) {
      return null;
    }
    
    // Format and return
    return formatDocument<Entity>(doc);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting entity:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ENTITY);
  }
}
```

## Common Gotchas

1. Always check if a filter is null before using it
2. Remember that MongoDB ObjectIds are not the same as string IDs
3. Use the correct error constants from the `ERROR_MESSAGES` object
4. Dates are now JavaScript Date objects, not Firestore Timestamps
5. Always include proper logging with a consistent prefix
6. Remember to handle transactions correctly with proper session management

## Available Utilities

### Filter Functions:
- `idFilter(id)`: Creates a filter for querying by _id field
- `stringIdFilter(field, id)`: Creates a filter for a field that stores string IDs
- `idFilterWithConditions(id, conditions)`: Creates a filter with ID and additional conditions
- `createMongoQuery(filters)`: Creates a MongoDB query from a filters object
- `createTextSearchQuery(text)`: Creates a text search query for MongoDB
- `startMongoSession()`: Starts a MongoDB transaction session
- `commitTransaction(session)`: Commits a transaction
- `abortTransaction(session)`: Aborts a transaction
- `withTransaction(callback)`: Wraps operations in a transaction
- `toMillis(date)`: Gets milliseconds from a date
- `toDate(value)`: Converts various formats to a Date object 