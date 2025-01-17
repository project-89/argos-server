# Argos Server API Documentation

## Overview

The Argos Server provides a comprehensive API for fingerprinting, tracking, and analytics operations. All protected endpoints require an API key passed in the `x-api-key` header.

## Authentication

### API Keys
- Required for all protected endpoints
- Passed via `x-api-key` header
- One key per fingerprint
- Can be revoked
- Rate limited per key

### Rate Limiting
- IP-based limits for public endpoints
- Key-based limits for protected endpoints
- Sliding window implementation
- Automatic cleanup of expired data

## Middleware Stack

### Public Routes
- IP-based rate limiting
- Request validation
- Metrics collection

### Protected Routes
1. **API Key Validation** (`auth.middleware.ts`)
   - Validates API key existence and validity
   - Sets `fingerprintId` on request
   - Returns 401 for invalid/missing keys

2. **Ownership Verification** (`ownershipCheck.middleware.ts`)
   - Ensures users can only access their own data
   - GET requests: 401 for mismatched ownership
   - POST/PUT/DELETE: 403 for mismatched ownership
   - Admins can bypass for specific endpoints

3. **Role Checking** (`roleCheck.middleware.ts`)
   - Verifies user has required permissions
   - Admin role has all permissions
   - Returns 403 for insufficient permissions

4. **Request Validation**
   - Schema-based validation using Zod
   - Consistent error format
   - Validates request body, query, and params

## API Endpoints

### Public Endpoints

#### Fingerprint Management
- `POST /fingerprint/register`
  - Register a new fingerprint
  - Body: `{ fingerprint: string, metadata?: object }`

#### API Key Management
- `POST /api-key/register`
  - Generate new API key for a fingerprint
  - Body: `{ fingerprintId: string }`
- `POST /api-key/validate`
  - Validate API key
  - Body: `{ key: string }`

#### Price Data
- `GET /price/current`
  - Get current token prices
  - Query: `?symbols=token1,token2`
  - Uses 5-minute cache
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
  - Returns stability metrics

### Protected Endpoints

#### API Key Management
- `POST /api-key/revoke`
  - Revoke API key
  - Body: `{ key: string }`
  - Requires: API key must match fingerprint

#### Fingerprint Operations
- `GET /fingerprint/:id`
  - Get fingerprint details
  - Params: `id` (fingerprint ID)
- `POST /fingerprint/update`
  - Update fingerprint metadata
  - Body: `{ fingerprintId: string, metadata: object }`

#### Visit & Presence Tracking
- `POST /visit`
  - Log a visit
  - Body: `{ fingerprintId: string, url: string, title?: string }`
- `POST /visit/presence`
  - Update presence status
  - Body: `{ fingerprintId: string, status: "online" | "offline" | "away" }`
- `POST /visit/remove-site`
  - Remove a site
  - Body: `{ fingerprintId: string, siteId: string }`
- `GET /visit/history/:fingerprintId`
  - Get visit history
  - Params: `fingerprintId`

#### Impression Management
- `POST /impressions`
  - Create impression
  - Body: `{ fingerprintId: string, type: string, data: object, source?: string, sessionId?: string }`
- `GET /impressions/:fingerprintId`
  - Get impressions
  - Params: `fingerprintId`
  - Query: `?type=string&startTime=string&endTime=string&limit=number&sessionId=string`
- `DELETE /impressions/:fingerprintId`
  - Delete impressions
  - Params: `fingerprintId`
  - Query: `?type=string&startTime=string&endTime=string&sessionId=string`

### Admin Endpoints

#### Role Management
- `POST /admin/role/assign`
  - Assign role to fingerprint
  - Body: `{ fingerprintId: string, role: string }`
  - Requires: Admin role
- `POST /admin/role/remove`
  - Remove role from fingerprint
  - Body: `{ fingerprintId: string, role: string }`
  - Requires: Admin role

## Error Handling

### Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  requestId: string;
  timestamp: string;
}
```

### HTTP Status Codes
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid API key)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Rate Limit Exceeded
- 500: Internal Server Error

## Rate Limits

### Public Endpoints
- Default: 100 requests per hour per IP
- Configurable per endpoint
- Sliding window implementation

### Protected Endpoints
- Default: 1000 requests per hour per API key
- Configurable per endpoint
- Separate limits for different operations

### Admin Endpoints
- Default: 10000 requests per hour per API key
- Higher limits for administrative operations
- Configurable per endpoint

## Caching

### Price Data
- 5-minute cache for current prices
- Automatic invalidation
- Cache size limits
- Hit rate monitoring

### Response Caching
- ETag support for cacheable endpoints
- Cache-Control headers
- Conditional requests supported

For development guidelines, testing procedures, and best practices, see [DEVELOPMENT.md](../DEVELOPMENT.md).