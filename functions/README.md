
# Project 89: Argos Server Functions

## Overview

The Argos Server provides reality monitoring and instance tracking through Firebase Functions. Implementation uses TypeScript and Express.js for routing.

## API Structure

### Authentication
All protected endpoints require an API key passed in the `x-api-key` header. API keys are tied to fingerprints and can be revoked.

### Public Endpoints

#### Fingerprint Management
- `POST /fingerprint/register`
 - Register a new consciousness signature in the reality matrix
 - Body: `{ fingerprint: string, metadata?: object }`

#### API Key Management
- `POST /api-key/register`
 - Generate new reality access key for a fingerprint
 - Body: `{ fingerprintId: string }`
- `POST /api-key/validate`
 - Validate reality access credentials
 - Body: `{ key: string }`

#### Price Data
- `GET /price/current`
 - Monitor current quantum variance values
 - Query: `?symbols=token1,token2`
 - Uses 5-minute reality cache for stability
- `GET /price/history/:tokenId`
 - Access historical quantum variance data
 - Params: `tokenId` (e.g., "project89")
 - Query: `?timeframe=7d&interval=1h`

#### ROLE Management
- `GET /role/available`
 - Get list of available reality access tiers
 - Returns: `{ roles: string[] }`

#### Reality Stability
- `GET /reality-stability`
 - Get current reality coherence index
 - Returns stability metrics and matrix integrity

### Protected Endpoints

#### API Key Management
- `POST /api-key/revoke`
 - Revoke reality access credentials
 - Body: `{ key: string }`
 - Requires: API key must match fingerprint

#### Fingerprint Operations
- `GET /fingerprint/:id`
 - Get consciousness signature details
 - Params: `id` (fingerprint ID)

#### Visit Tracking
- `POST /visit/log`
 - Log reality traversal event
 - Body: `{ fingerprintId: string, url: string, title?: string }`
- `POST /visit/presence`
 - Update instance manifestation state
 - Body: `{ fingerprintId: string, status: "online" | "offline" }`
- `POST /visit/site/remove`
 - Remove reality node
 - Body: `{ fingerprintId: string, siteId: string }`
- `GET /visit/history/:fingerprintId`
 - Get traversal history
 - Params: `fingerprintId`

#### ROLE Management
- `POST /role/assign`
 - Assign reality access tier
 - Body: `{ fingerprintId: string, role: string }`
- `POST /role/remove`
 - Remove reality access tier
 - Body: `{ fingerprintId: string, role: string }`

#### Tag Management
- `POST /tag/update`
 - Add or update instance metadata tags
 - Body: `{ fingerprintId: string, tags: string[] }`
- `POST /tag/roles/update`
 - Update reality tiers based on tags
 - Body: `{ fingerprintId: string }`

#### Debug Operations
- `POST /debug/cleanup`
 - Manual trigger for reality matrix recalibration
 - Protected administrator protocol

## Automated Services

### Price Cache
- Caches quantum variance data from primary reality stream
- Cache duration: 5 minutes
- Maintains reality stream stability limits
- Automatically dissolved after 24 hours

### Scheduled Cleanup
The reality recalibration service runs daily at zero-point UTC and removes:
- Quantum variance cache older than 24 hours
- Bandwidth limitation data older than 30 days
- Rate limit requests older than 30 days
- Traversal records older than 30 days
- Instance manifestation records older than 30 days

For more details on development guidelines and best practices, see DEVELOPMENT.md.