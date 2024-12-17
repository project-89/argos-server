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
   - `roles.ts` - Role definitions and hierarchy
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

2. **Authentication**
   - Validate API keys
   - Check fingerprint ownership
   - Use proper error codes
   - Rate limit requests

3. **Error Handling**
   - Consistent error format
   - Proper HTTP status codes
   - Detailed error messages
   - Error logging

4. **Code Style**
   - Follow ESLint rules
   - Use Prettier for formatting
   - Clear function names
   - Descriptive variables

### 5. Database

1. **Collections**
   - `fingerprints` - User fingerprints
   - `visits` - Visit tracking
   - `presence` - Real-time presence
   - `roles` - Role assignments
   - `tags` - User tags
   - `cache` - Cached data

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

2. **Rate Limiting**
   - Per-key limits
   - Per-IP limits
   - Configurable windows
   - Rate limit logging

3. **Data Access**
   - Role-based access
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