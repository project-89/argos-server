# Argos Server

Argos Server is a Firebase Functions-based API server that handles fingerprinting, visit tracking, and pricing operations. The server is designed to be secure, scalable, and maintainable with a strong emphasis on authentication and data integrity.

## API Structure

### Public Endpoints
These endpoints do not require API key authentication:
- `/fingerprint/register` - Register a new fingerprint
- `/api-key/register` - Register a new API key for a fingerprint
- `/api-key/validate` - Validate an API key
- `/role/available` - Get available roles
- `/price/current` - Get current token prices
- `/price/history/:tokenId` - Get historical price data
- `/reality-stability` - Get reality stability index

### Protected Endpoints
These endpoints require a valid API key in the `x-api-key` header:
- `/api-key/revoke` - Revoke an API key
- `/fingerprint/:id` - Get fingerprint details
- `/visit/log` - Log a visit
- `/visit/presence` - Update presence status
- `/visit/site/remove` - Remove a site
- `/visit/history/:fingerprintId` - Get visit history

### Admin Endpoints
These endpoints require a valid API key with admin role:
- `/admin/role/assign` - Assign a role
- `/admin/role/remove` - Remove a role
- `/admin/tag/update` - Add or update tags
- `/admin/tag/roles/update` - Update roles based on tags
- `/admin/debug/cleanup` - Manual cleanup trigger

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
- Per-minute request limits
- Monthly quota tracking
- Automatic cleanup of old rate limit data

## Documentation
- [Development Guide](DEVELOPMENT.md)
- [Functions README](functions/README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [License](LICENSE)