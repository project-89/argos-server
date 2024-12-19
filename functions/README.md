# Project 89: Argos Server Functions

## Overview

This directory contains the Firebase Functions that power the Argos Server. The functions are written in TypeScript and use Express.js for routing.

## API Structure

### Authentication
All protected endpoints require an API key passed in the `x-api-key` header. API keys are tied to fingerprints and can be revoked.

### Public Endpoints

#### Fingerprint Management
- `POST /fingerprint/register`
  - Register a new fingerprint
  - Body: `{ fingerprint: string, metadata?: object }`

#### API Key Management
- `POST /api-key/register`
  - Register a new API key for a fingerprint
  - Body: `{ fingerprintId: string }`
- `POST /api-key/validate`
  - Validate an API key
  - Body: `{ key: string }`

#### Price Data
- `GET /price/current`
  - Get current token prices
  - Query: `?symbols=token1,token2`
  - Uses 5-minute cache to respect CoinGecko API limits
- `GET /price/history/:tokenId`
  - Get historical price data
  - Params: `tokenId` (e.g., "project89")
  - Query: `?timeframe=7d&interval=1h`

#### Role Management
- `GET /role/available`
  - Get list of available roles
  - Returns: `{ roles: string[] }`

#### Reality Stability
- `GET /reality-stability`
  - Get current reality stability index
  - Returns stability metrics and matrix integrity

### Protected Endpoints

#### API Key Management
- `POST /api-key/revoke`
  - Revoke an API key
  - Body: `{ key: string }`
  - Requires: API key must match fingerprint

#### Fingerprint Operations
- `GET /fingerprint/:id`
  - Get fingerprint details
  - Params: `id` (fingerprint ID)

#### Visit Tracking
- `POST /visit/log`
  - Log a visit
  - Body: `{ fingerprintId: string, url: string, title?: string }`
- `POST /visit/presence`
  - Update presence status
  - Body: `{ fingerprintId: string, status: "online" | "offline" }`
- `POST /visit/site/remove`
  - Remove a site
  - Body: `{ fingerprintId: string, siteId: string }`
- `GET /visit/history/:fingerprintId`
  - Get visit history
  - Params: `fingerprintId`

#### Role Management
- `POST /role/assign`
  - Assign a role
  - Body: `{ fingerprintId: string, role: string }`
- `POST /role/remove`
  - Remove a role
  - Body: `{ fingerprintId: string, role: string }`

#### Tag Management
- `POST /tag/update`
  - Add or update tags
  - Body: `{ fingerprintId: string, tags: string[] }`
- `POST /tag/roles/update`
  - Update roles based on tags
  - Body: `{ fingerprintId: string }`

#### Debug Operations
- `POST /debug/cleanup`
  - Manual trigger for cleanup operation
  - Protected admin endpoint

## Automated Services

### Price Cache
- Caches price data from CoinGecko API
- Cache duration: 5 minutes
- Helps stay within API rate limits
- Automatically cleaned up after 24 hours

### Scheduled Cleanup
The cleanup service runs daily at midnight UTC and removes:
- Price cache entries older than 24 hours
- Rate limit stats older than 30 days
- Rate limit requests older than 30 days
- Visit records older than 30 days
- Presence records older than 30 days

Configuration:
```hcl
# Cloud Scheduler job
resource "google_cloud_scheduler_job" "cleanup_scheduler" {
  name        = "argos-cleanup-scheduler"
  schedule    = "0 0 * * *"  # Midnight UTC
  time_zone   = "UTC"
  # ... configuration ...
}
```

## Development

### Local Testing
```bash
# Start emulators
firebase emulators:start

# Run tests
npm test

# Test specific endpoint
npm test src/test/endpoints/price.endpoint.test.ts
```

### Environment Variables
```bash
# Required
FIREBASE_PROJECT_ID=your-project-id
COINGECKO_API_KEY=your-api-key
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173

# Optional
NODE_ENV=development  # or "production" or "test"
RATE_LIMIT_ENABLED=true  # Set to "false" to disable rate limiting
```

### Deployment
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:functionName
```

## Security

### Rate Limiting

The server implements strict rate limiting:

- Default: 100 requests per hour per API key/IP
- Rate limits are enforced in production and development
- Can be disabled by setting RATE_LIMIT_ENABLED=false
- Rate limit data stored in Firestore
- Automatic cleanup of old rate limit data
- Rate limit stats logged for monitoring

Rate limit responses:
```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 3600 // seconds until reset
}
```

### CORS Protection
- Environment-specific origin validation
- No wildcard origins in production
- Proper preflight handling
- Configurable headers and methods

For more details on development guidelines and best practices, see [DEVELOPMENT.md](../DEVELOPMENT.md).