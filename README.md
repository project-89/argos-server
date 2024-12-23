# Argos Server

Argos Server is a Firebase Functions-based API server that handles fingerprinting, visit tracking, and pricing operations. The server is designed to be secure, scalable, and maintainable with a strong emphasis on authentication and data integrity.

## Architecture

### Service Layer
The server implements a robust service layer pattern:
- Clear separation of business logic from controllers
- Standardized error handling and logging
- Transaction management for data consistency
- Service-level validation and security
- Reusable service methods

### Response Standardization
All API responses follow a consistent format:
- Success responses include typed data
- Error responses include clear messages and codes
- Consistent HTTP status codes
- Appropriate response headers
- Type-safe response utilities

## API Structure

### Public Endpoints
These endpoints do not require API key authentication:
- `POST /fingerprint/register` - Register a new fingerprint
  - Response: `{ success: true, data: { fingerprintId: string } }`
- `POST /api-key/register` - Register a new API key for a fingerprint
  - Response: `{ success: true, data: { apiKey: string } }`
- `POST /api-key/validate` - Validate an API key
  - Response: `{ success: true, data: { valid: boolean, needsRefresh: boolean } }`
- `GET /role/available` - Get available roles
  - Response: `{ success: true, data: string[] }`
- `GET /price/current` - Get current token prices
  - Response: `{ success: true, data: { [tokenId: string]: { usd: number, usd_24h_change: number } } }`
- `GET /price/history/:tokenId` - Get historical price data
  - Response: `{ success: true, data: { timestamp: number, price: number }[] }`
- `GET /reality-stability` - Get reality stability index
  - Response: `{ success: true, data: { index: number, timestamp: number } }`

### Protected Endpoints
These endpoints require a valid API key in the `x-api-key` header:
- `POST /api-key/revoke` - Revoke an API key
  - Response: `{ success: true }`
- `GET /fingerprint/:id` - Get fingerprint details
  - Response: `{ success: true, data: { id: string, ... } }`
- `POST /visit/log` - Log a visit
  - Response: `{ success: true, data: { visitId: string } }`
- `POST /visit/presence` - Update presence status
  - Response: `{ success: true }`
- `POST /visit/site/remove` - Remove a site
  - Response: `{ success: true }`
- `GET /visit/history/:fingerprintId` - Get visit history
  - Response: `{ success: true, data: Visit[] }`

### Admin Endpoints
These endpoints require a valid API key with admin role:
- `POST /admin/role/assign` - Assign a role
  - Response: `{ success: true }`
- `POST /admin/role/remove` - Remove a role
  - Response: `{ success: true }`
- `POST /admin/tag/update` - Add or update tags
  - Response: `{ success: true }`
- `POST /admin/tag/roles/update` - Update roles based on tags
  - Response: `{ success: true }`
- `POST /admin/debug/cleanup` - Manual cleanup trigger
  - Response: `{ success: true }`

### Error Responses
All endpoints return standardized error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid API key)
- 403: Forbidden (insufficient permissions)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

### Rate Limiting
The server implements two levels of rate limiting:

1. **IP-based Rate Limiting**
   - 300 requests per hour per IP
   - Applies to all endpoints
   - Helps prevent abuse from single IPs

2. **Fingerprint-based Rate Limiting**
   - 1000 requests per hour per fingerprint
   - Applies to protected endpoints
   - Ensures fair resource usage

Rate limit responses include headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time until limit resets (Unix timestamp)

### Automated Services
- **Price Cache**: Caches price data for 5 minutes to respect CoinGecko API rate limits
- **Scheduled Cleanup**: Daily cleanup job that removes:
  - Price cache entries (older than 24 hours)
  - Rate limit stats (older than 30 days)
  - Rate limit requests (older than 30 days)
  - Visit records (older than 30 days)
  - Presence records (older than 30 days)

## Development

### Prerequisites
- Node.js 18+
- Firebase CLI
- Google Cloud SDK
- Terraform

### Setup
1. Clone the repository
```bash
git clone https://github.com/Oneirocom/argos-server.git
cd argos-server
```

2. Install dependencies
```bash
npm install
cd functions
npm install
```

3. Copy environment templates
```bash
cp .env.template .env
cp terraform.tfvars.template terraform.tfvars
```

4. Configure environment variables
```bash
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_REGION=us-central1
COINGECKO_API_KEY=your-api-key
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173
FIREBASE_CONFIG_ENCRYPTION_API_KEY=your-base64-encoded-32-byte-key
FIREBASE_CONFIG_ENCRYPTION_API_IV=your-base64-encoded-16-byte-iv
```

### Development Workflow
1. Start emulators
```bash
firebase emulators:start
```

2. Run tests
```bash
cd functions
npm test
```

3. Deploy
```bash
# Deploy infrastructure
terraform init
terraform plan
terraform apply

# Deploy functions
firebase deploy --only functions
```

## Infrastructure

The server uses the following Google Cloud services:
- Firebase Functions
- Firestore
- Cloud Scheduler
- Cloud Pub/Sub
- Cloud Storage

### Cleanup Service
A scheduled cleanup service runs daily to maintain database performance and stay within quotas:
```hcl
# Cloud Function: Scheduled Cleanup
resource "google_cloudfunctions_function" "scheduledCleanup" {
  name        = "argos-scheduled-cleanup"
  description = "Performs scheduled cleanup of old data"
  runtime     = "nodejs18"
  entry_point = "scheduledCleanup"
  # ... configuration ...
}
```

## Security

### API Key Authentication
- All protected endpoints require a valid API key
- API keys are tied to fingerprints
- Keys can be revoked and are automatically disabled on re-registration
- API keys are encrypted at rest using AES-256-CBC
- Each API key is uniquely encrypted with a secure initialization vector
- Encryption keys and IVs are managed through environment variables

### Role-Based Access Control
- Admin endpoints require admin role
- Role management restricted to admin users
- Tag management restricted to admin users
- Default user role assigned on registration
- Role validation middleware for protected routes

### Request Validation
- Zod-based schema validation for all endpoints
- Type-safe request validation
- Consistent error messages
- Automatic type inference from schemas
- Validation middleware for all routes

### CORS Protection
- Environment-specific origin validation
- No wildcard origins in production
- Proper preflight handling
- Configurable headers and methods

### Rate Limiting
- IP-based rate limiting (300/hour)
- Fingerprint-based rate limiting (1000/hour)
- Firestore-backed persistence
- Automatic cleanup of old rate limit data
- Graceful handling of database errors
- Concurrent request handling

### Error Handling
- Standardized error responses
- Proper status codes
- Detailed error messages in development
- Sanitized error messages in production
- Error logging and monitoring
- Transaction error handling

### Middleware Architecture
- Composable middleware pattern
- Conditional middleware application
- Context passing between middleware
- Middleware configuration management
- Performance monitoring
- Error propagation

## Test Coverage
- 137 tests across 18 test suites
- End-to-end API testing
- Middleware unit testing
- Service layer testing
- Error handling testing
- Rate limiting testing
- Concurrent request testing

## Documentation
- [Development Guide](DEVELOPMENT.md)
- [Functions README](functions/README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [License](LICENSE)