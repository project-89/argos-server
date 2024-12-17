# Argos Server

A Firebase Functions-based API server for fingerprinting, visit tracking, and role management.

## Architecture

The server is built using:
- Firebase Functions
- Express.js
- TypeScript
- Firebase Admin SDK

### Key Components

1. **Authentication**
   - API key-based authentication
   - One API key per fingerprint
   - Public endpoints for registration and basic operations

2. **Rate Limiting**
   - Per IP and API key rate limiting
   - Configurable windows and limits
   - Rate limit stats tracking

3. **Endpoints**
   - `/fingerprint/*` - Fingerprint registration and management
   - `/api-key/*` - API key operations
   - `/visit/*` - Visit tracking and presence management
   - `/role/*` - Role assignment and management
   - `/tag/*` - Tag tracking and role-based rules
   - `/price/*` - Price tracking operations
   - `/debug/*` - Debug operations (protected)

4. **Data Model**
   - Fingerprints collection
   - Visits collection
   - Presence collection
   - Roles collection
   - Tags collection
   - Cache collection

## Setup

1. **Prerequisites**
   ```bash
   npm install -g firebase-tools
   ```

2. **Installation**
   ```bash
   cd functions
   npm install
   ```

3. **Local Development**
   ```bash
   npm run serve
   ```

4. **Testing**
   ```bash
   npm test
   ```

5. **Build**
   ```bash
   npm run build
   ```

## API Documentation

### Public Endpoints

- `POST /fingerprint/register` - Register a new fingerprint
- `POST /api-key/register` - Register a new API key
- `POST /api-key/validate` - Validate an API key
- `POST /api-key/revoke` - Revoke an API key
- `GET /role/available` - Get available roles
- `GET /price/current` - Get current price
- `GET /price/history/:tokenId` - Get price history
- `GET /reality-stability` - Get reality stability index
- `POST /visit/log` - Log a visit

### Protected Endpoints (Require API Key)

- `GET /fingerprint/:id` - Get fingerprint details
- `POST /visit/presence` - Update presence status
- `POST /visit/site/remove` - Remove a site visit
- `GET /visit/history/:fingerprintId` - Get visit history
- `POST /role/assign` - Assign a role
- `POST /role/remove` - Remove a role
- `POST /tag/update` - Update tags
- `POST /tag/roles/update` - Update roles based on tags
- `POST /debug/cleanup` - Clean up data (protected)

## Security

- All protected endpoints require a valid API key
- API keys are bound to specific fingerprints
- Rate limiting prevents abuse
- Role-based access control
- Request validation and sanitization

### CORS Configuration

The server implements a secure CORS policy that can be configured through environment variables:

```bash
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

Default development origins are:
- http://localhost:5173 (Vite dev server)
- http://localhost:3000 (React dev server)
- http://localhost:5000 (Firebase hosting emulator)

CORS security features:
- Origin validation
- Configurable allowed methods
- Explicit allowed headers
- Credentials support
- Preflight request caching
- Proper OPTIONS handling

For development, the default origins are automatically allowed. For production, you must set the `ALLOWED_ORIGINS` environment variable.

### CORS Security

The server implements a strict CORS policy with environment-specific configurations:

#### Production
- Strict origin validation against allowlist
- No wildcard origins allowed
- Origins configured through:
  - Environment variables (`ALLOWED_ORIGINS`)
  - Production configuration
- Credentials support for authenticated requests

#### Development/Testing
- Controlled development environment access
- Local development servers allowed
- Test origins for integration testing
- Environment-based validation

For detailed CORS configuration and security measures, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Environment Variables

Required environment variables for CORS security:

```bash
# Production origins (comma-separated)
ALLOWED_ORIGINS=https://oneirocom.ai,https://other-allowed-domain.com

# Environment control
NODE_ENV=production  # or "development" or "test"
```

### Security Best Practices

1. **CORS Protection**
   - Strict origin validation
   - No wildcard origins in production
   - Environment-specific configurations
   - Proper preflight handling

2. **Request Security**
   - API key validation
   - Rate limiting
   - Request validation
   - Error handling

3. **Monitoring**
   - Unauthorized access logging
   - CORS violation tracking
   - Security event monitoring

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development guidelines and best practices.