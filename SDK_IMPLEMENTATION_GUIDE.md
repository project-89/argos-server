# Argos SDK Implementation Guide

## Overview
This guide details how to implement a client SDK for the Argos server. The SDK should handle fingerprint registration, API key management, and various tracking operations.

## Authentication Flow

1. **Register Fingerprint**
   ```typescript
   POST /fingerprint/register
   Body: { fingerprint: string, metadata?: Record<string, any> }
   Response: { success: true, data: { id: string } }
   ```

2. **Register API Key**
   ```typescript
   POST /api-key/register
   Body: { fingerprintId: string }
   Response: { 
     success: true, 
     data: { 
       key: string,
       fingerprintId: string 
     }
   }
   ```

3. **Using the API Key**
   - Include in all protected requests via `x-api-key` header
   - Store both API key and fingerprint ID securely
   - API keys are encrypted and cannot be recovered if lost

## Protected Endpoints

### Impressions
```typescript
// Create impression
POST /impressions
Body: {
  fingerprintId: string;
  type: string;
  data: Record<string, any>;
  source?: string;
  sessionId?: string;
}

// Get impressions
GET /impressions/:fingerprintId
Query: {
  type?: string;
  startTime?: string; // ISO datetime
  endTime?: string;   // ISO datetime
  limit?: number;
  sessionId?: string;
}

// Delete impressions
DELETE /impressions/:fingerprintId
Query: {
  type?: string;
  startTime?: string;
  endTime?: string;
  sessionId?: string;
}
```

### Visit Tracking
```typescript
// Log visit
POST /visit/log
Body: {
  fingerprintId: string;
  url: string;
  title?: string;
}

// Update presence
POST /visit/presence
Body: {
  fingerprintId: string;
  status: "online" | "offline";
}

// Get visit history
GET /visit/history/:fingerprintId

// Remove site
POST /visit/site/remove
Body: {
  fingerprintId: string;
  siteId: string;
}
```

### Fingerprint Management
```typescript
// Get fingerprint
GET /fingerprint/:id

// Update fingerprint metadata
POST /fingerprint/update
Body: {
  metadata: Record<string, any>;
}
```

### API Key Management
```typescript
// Validate API key
POST /api-key/validate
Body: { key: string }
Response: { 
  success: true, 
  data: { 
    isValid: boolean,
    needsRefresh: boolean 
  }
}

// Revoke API key
POST /api-key/revoke
Body: { key: string }
```

## Public Endpoints

### Price Data
```typescript
// Get current prices
GET /price/current
Query: { symbols?: string } // Comma-separated list

// Get price history
GET /price/history/:tokenId
```

### Reality Stability
```typescript
GET /reality-stability
Response: {
  success: true,
  data: {
    stabilityIndex: number;
    currentPrice: number;
    priceChange: number;
    timestamp: number;
  }
}
```

## Error Handling

### Response Format
```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string,
  requestId: string,
  timestamp: number
}

// Error Response
{
  success: false,
  error: string,
  requestId: string,
  timestamp: number
}
```

### Common Error Codes
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (missing/invalid API key)
- 403: Forbidden (API key doesn't match fingerprint)
- 404: Not Found
- 429: Rate Limit Exceeded
- 500: Internal Server Error

## Rate Limiting
- Public endpoints: 100 requests per hour per IP
- Protected endpoints: 1000 requests per hour per API key
- Health endpoints: 60 requests per minute per IP

## Security Considerations
1. Store API keys securely
2. Always use HTTPS in production
3. Validate fingerprint ownership before operations
4. Handle rate limits gracefully
5. Implement proper error handling
6. Use appropriate CORS origins

## SDK Implementation Tips
1. Implement automatic API key refresh when `needsRefresh: true`
2. Use exponential backoff for retries
3. Cache fingerprint ID with API key
4. Implement proper request queuing
5. Handle concurrent requests efficiently
6. Provide TypeScript types for all endpoints 