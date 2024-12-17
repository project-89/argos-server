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