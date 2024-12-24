# Development Guidelines

## Project Structure

```
argos-server/           # Repository root
├── functions/          # Firebase Functions directory
│   ├── src/           # Source code directory
│   │   ├── constants/ # Global constants and configurations
│   │   ├── middleware/# Express middleware (auth, validation, etc.)
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic and data operations
│   │   ├── types/     # TypeScript type definitions
│   │   ├── utils/     # Helper functions and utilities
│   │   └── test/      # Test files mirroring src structure
│   │       ├── endpoints/  # API endpoint tests
│   │       ├── setup/     # Test configuration and setup
│   │       └── utils/     # Test utilities
│   ├── package.json   # Node.js dependencies and scripts
│   └── tsconfig.json  # TypeScript configuration
└── README.md          # Repository documentation
```

## Development Process

### 1. Environment Setup

1. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Start Firebase emulators:
   ```bash
   npm run serve
   ```

3. Run tests:
   ```bash
   npm test
   ```

### 2. Code Organization

1. **Endpoints**
   - One file per logical group of endpoints
   - Clear function names matching routes
   - Consistent error handling
   - Request validation
   - API key verification

2. **Middleware**
   - `auth.middleware.ts` - API key validation
   - `rateLimit.middleware.ts` - Request rate limiting
   - Add new middleware as needed

3. **Constants**
   - `roles.ts` - ROLE definitions and hierarchy
   - `collections.ts` - Firestore collection names
   - `config.ts` - Environment configuration
   - `api.ts` - API-related constants

### 3. Testing

1. **Test Organization**
   - Tests mirror source structure
   - One test file per endpoint file
   - Shared test utilities
   - Clean database between tests

2. **Test Requirements**
   - Run type checking before tests
   - Test both success and error cases
   - Test authentication and authorization
   - Use dynamic API keys
   - Clean up test data

3. **Running Tests**
   ```bash
   npm run build        # Run type checking
   npm test            # Run all tests
   npm test <pattern>  # Run specific tests
   ```

### 4. Best Practices

1. **TypeScript**
   - Use strict type checking
   - Define interfaces for all data structures
   - Use enums for constants
   - Proper error typing
   - Use Zod schemas for runtime validation

2. **Request Validation**
   - Use validation middleware for all endpoints
   - Define Zod schemas in route files
   - Consistent error message format
   - Type inference from schemas
   - Validate request body, params, and query
   - Handle validation errors uniformly

3. **Authentication**
   - Validate API keys
   - Check fingerprint ownership
   - Use proper error codes
   - Rate limit requests

4. **Error Handling**
   - Consistent error format
   - Proper HTTP status codes
   - Detailed error messages
   - Error logging
   - Validation error handling

5. **Code Style**
   - Follow ESLint rules
   - Use Prettier for formatting
   - Clear function names
   - Descriptive variables
   - Document validation schemas

### 5. Database

1. **Collections**
   - `fingerprints` - User fingerprints
   - `visits` - Visit tracking
   - `presence` - Real-time presence
   - `roles` - ROLE assignments
   - `tags` - User tags
   - `cache` - Cached data
   - `impressions` - User interaction tracking

2. **Best Practices**
   - Use batch operations
   - Proper indexing
   - Data validation
   - Clean up old data

### 6. Security

1. **API Keys**
   - One key per fingerprint
   - Regular key rotation
   - Key validation
   - Ownership verification
   - AES-256-CBC encryption for stored keys
   - Environment variables required:
     - `FIREBASE_CONFIG_ENCRYPTION_API_KEY`: Base64 encoded 32-byte key
     - `FIREBASE_CONFIG_ENCRYPTION_API_IV`: Base64 encoded 16-byte IV
   - Unique IV per API key
   - Automatic encryption/decryption handling

   **Generating Production Keys**
   ```bash
   # Generate a secure 32-byte key and encode it in base64
   openssl rand -base64 32 > prod-key.txt

   # Generate a secure 16-byte IV and encode it in base64
   openssl rand -base64 16 > prod-iv.txt
   ```
   
   Never commit production keys to version control. Store them securely in your production environment variables or secret management system.

2. **Rate Limiting**
   - Per-key limits
   - Per-IP limits
   - Configurable windows
   - Rate limit logging

3. **Data Access**
   - ROLE-based access
   - Input validation
   - Output sanitization
   - Error masking

### 7. Deployment

1. **Build Process**
   ```bash
   npm run build
   ```

2. **Type Checking**
   ```bash
   npm run type-check
   ```

3. **Deployment**
   ```bash
   firebase deploy --only functions
   ```

### 8. Monitoring

1. **Logging**
   - Request logging
   - Error logging
   - Rate limit tracking
   - Performance monitoring

2. **Metrics**
   - Response times
   - Error rates
   - API key usage
   - Resource utilization

## Contributing

1. Create a feature branch
2. Make changes
3. Run type checking
4. Run tests
5. Update documentation
6. Submit pull request

## Troubleshooting

1. **Common Issues**
   - API key validation
   - Rate limiting
   - Type errors
   - Test failures

2. **Solutions**
   - Check logs
   - Verify types
   - Test isolation
   - Clean test data

## Development Progress

### Request Validation Implementation

#### Validation Middleware
- [x] Created Zod-based validation middleware
- [x] Implemented request schema validation
- [x] Added type inference from schemas
- [x] Updated all endpoints to use validation
- [x] Added comprehensive validation tests
- [x] Fixed validation error messages
- [x] Resolved linter errors

#### Endpoint Updates
- [x] Updated fingerprint endpoints
- [x] Updated API key endpoints
- [x] Updated visit endpoints
- [x] Updated role endpoints
- [x] Updated tag endpoints
- [x] Updated price endpoints
- [x] Updated reality stability endpoint
- [x] Added impression endpoints with validation and tests

#### Testing and Documentation
- [x] Updated test suites for validation
- [x] Fixed failing tests
- [x] Updated documentation
- [x] Added validation patterns to guidelines
- [x] Verified all tests passing

### Recent Updates

#### Security Improvements
- [x] Enhanced Firestore security rules
- [x] Implemented suspicious IP detection
- [x] Added detailed logging for security events
- [x] Updated environment detection logic

#### Router Organization
- [x] Moved admin endpoints to dedicated router
- [x] Improved role-based access control
- [x] Consolidated tag and role endpoints under admin routes
- [x] Removed API key requirement from scheduled cleanup
- [x] Updated tests to reflect new routing structure
- [x] Fixed fingerprint tag initialization
- [x] Standardized error handling across endpoints

#### Test Improvements
- [x] Added comprehensive admin endpoint tests
- [x] Updated role validation tests
- [x] Fixed encryption configuration in tests
- [x] Improved test data cleanup
- [x] Added test coverage for new admin routes
- [x] Fixed tag validation in tests

### CORS Configuration and Security

#### Environment-Specific CORS Behavior

1. **Production Environment**
   - Strict CORS checks against explicitly allowed origins
   - Origins configured through:
     - `productionOrigins` list in config
     - `ALLOWED_ORIGINS` environment variable
   - No wildcard origins allowed
   - All requests must have valid origin headers

2. **Development/Test Environment**
   - More permissive but controlled CORS configuration
   - Allows development servers:
     - Vite dev server (http://localhost:5173)
     - React dev server (http://localhost:3000)
     - Firebase emulator (http://localhost:5000)
   - Test origins for integration testing
   - Still enforces origin validation

#### Security Measures

1. **CORS Headers**
   ```typescript
   {
     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
     credentials: true,
     maxAge: 86400, // 24 hours
   }
   ```

2. **Origin Validation**
   - Production: Strict checking against allowlist
   - Development: Controlled permissiveness
   - No wildcard origins in production
   - Environment-specific configuration

3. **Environment Variables**
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
   - `NODE_ENV`: Controls environment-specific behavior
   - `FUNCTIONS_EMULATOR`: Identifies local development

#### Testing CORS

1. **Running CORS Tests**
   ```bash
   cd functions
   npm test src/test/middleware/cors.test.ts
   ```

2. **Test Coverage**
   - Default development origins
   - Configured test origins
   - Unauthorized origins
   - Preflight requests
   - Requests with no origin
   - Environment variable overrides

#### Deployment Checklist

1. **Environment Setup**
   - Set `ALLOWED_ORIGINS` with production domains
   - Ensure `NODE_ENV=production`
   - Verify `FUNCTIONS_EMULATOR` is not set

2. **Security Verification**
   - Confirm CORS headers in responses
   - Test unauthorized origin blocking
   - Verify credentials handling
   - Check preflight request handling

3. **Monitoring**
   - Log unauthorized access attempts
   - Monitor for missing CORS configurations
   - Track CORS-related errors

### Development Guidelines

1. **Adding New Origins**
   - Add to appropriate configuration section
   - Document purpose and ownership
   - Test CORS behavior
   - Update relevant tests

2. **Security Considerations**
   - Never use wildcard origins in production
   - Always validate origin headers
   - Use environment variables for dynamic configuration
   - Maintain strict CORS in production

3. **Testing Requirements**
   - Test all CORS scenarios
   - Verify environment-specific behavior
   - Check error handling
   - Validate security measures

### Rate Limiting

The server implements rate limiting to protect against abuse:

- Rate limits are enforced per API key or IP address
- Default limit: 100 requests per hour
- Rate limiting is automatically bypassed in test environment (`NODE_ENV === "test"`)
- Rate limit data is stored in Firestore
- Automatic cleanup of old rate limit data
- Rate limit stats are logged for monitoring

Rate limit responses include:
- 429 status code
- Error message
- Retry-After header
- Time remaining until reset

Rate limiting cannot be bypassed in production, ensuring robust protection against abuse.

### Service Layer Implementation

#### Service Architecture
- [x] Implemented service layer pattern
- [x] Separated business logic from controllers
- [x] Created base service class with common operations
- [x] Standardized error handling in services
- [x] Added service-level validation
- [x] Implemented transaction handling
- [x] Added service-level logging

#### Service Layer Benefits
1. **Code Organization**
   - Clear separation of concerns
   - Business logic isolation
   - Reusable service methods
   - Consistent error handling
   - Standardized logging

2. **Transaction Management**
   - Atomic operations
   - Consistent database state
   - Error rollback
   - Deadlock prevention
   - Connection pooling

3. **Error Handling**
   - Service-specific errors
   - Detailed error messages
   - Error categorization
   - Error logging
   - Error recovery

4. **Testing**
   - Isolated service testing
   - Mock database operations
   - Transaction testing
   - Error scenario testing
   - Service integration testing

### Response Standardization

#### Response Format
All API responses follow a standard format:

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}
```

#### Implementation Details
1. **Success Responses**
   - Always include `success: true`
   - Data in typed `data` field
   - Consistent structure
   - Optional metadata
   - Type safety

2. **Error Responses**
   - Always include `success: false`
   - Clear error messages
   - Error codes for categorization
   - Stack traces in development
   - Sanitized messages in production

3. **Status Codes**
   - 200: Successful operation
   - 201: Resource created
   - 400: Bad request / validation error
   - 401: Authentication error
   - 403: Authorization error
   - 404: Resource not found
   - 429: Rate limit exceeded
   - 500: Server error

4. **Response Utilities**
   ```typescript
   // Success response
   sendSuccess<T>(res: Response, data: T): void

   // Error response
   sendError(res: Response, error: ApiError): void

   // Warning response
   sendWarning(res: Response, message: string): void
   ```

#### Response Examples
```typescript
// Success Response
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Example"
  }
}

// Error Response
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

#### Response Headers
- `Content-Type: application/json`
- `Cache-Control` appropriate for endpoint
- `X-Request-ID` for tracking
- Rate limit headers where applicable
- CORS headers as configured