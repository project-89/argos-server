# MongoDB Migration

The server has been migrated from Firestore to MongoDB. To ensure consistent patterns across the codebase, follow these guidelines:

## MongoDB Filter Pattern

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

## MongoDB Sessions

Use the session utilities instead of directly accessing client:

```typescript
// ❌ AVOID
const session = db.client.startSession();

// ✅ USE
const session = await startMongoSession();
```

## Timestamp Handling

Date objects don't have toMillis() method. Use the timestamp utilities:

```typescript
// ❌ AVOID
const ms = date.toMillis();

// ✅ USE
const ms = toMillis(date);
```

For complete guidance, see [MongoDB Migration Guide](docs/mongodb-migration.md). 