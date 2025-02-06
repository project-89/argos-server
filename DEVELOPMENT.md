# Development Guidelines

## Project Structure

```
argos-server/           # Repository root
├── functions/          # Firebase Functions directory
│   ├── src/           # Source code directory
│   │   ├── constants/ # Global constants and configurations
│   │   ├── endpoints/ # API endpoint handlers
│   │   ├── middleware/# Express middleware (auth, validation, etc.)
│   │   ├── routes/    # Route definitions (public, protected, admin)
│   │   ├── schemas/   # Request/response Zod schemas
│   │   ├── services/  # Business logic and data operations
│   │   ├── types/     # TypeScript type definitions
│   │   ├── utils/     # Helper functions and utilities
│   │   ├── public/    # Public assets and static files
│   │   ├── scheduled/ # Scheduled and cron jobs
│   │   ├── scripts/   # Utility scripts
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

2. Configure environment:
   - Copy `.env.development` for local development
   - Copy `.env.test` for testing
   - Copy `.env.production` for production

3. Start Firebase emulators:
   ```bash
   npm run serve
   ```

4. Run tests:
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
   - `ipRateLimit.middleware.ts` - IP-based rate limiting
   - `fingerprintRateLimit.middleware.ts` - Fingerprint-based rate limiting
   - `ownershipCheck.middleware.ts` - Resource ownership verification
   - `roleCheck.middleware.ts` - Role-based access control
   - `validation.middleware.ts` - Request validation
   - `error.middleware.ts` - Error handling
   - `metrics.ts` - Performance and usage metrics

3. **Services**
   - `fingerprintService.ts` - Fingerprint management
   - `apiKeyService.ts` - API key operations
   - `visitService.ts` - Visit tracking
   - `presenceService.ts` - Presence management
   - `impressionService.ts` - Analytics
   - `priceService.ts` - Price data handling
   - `roleService.ts` - Role management
   - `realityStabilityService.ts` - Stability tracking
   - `cleanup.service.ts` - Data maintenance
   - `cacheService.ts` - Caching operations

4. **Constants**
   - `roles.ts` - ROLE definitions and hierarchy
   - `collections.ts` - Firestore collection names
   - `config.ts` - Environment configuration
   - `api.ts` - API-related constants

5. **Scheduled Tasks**
   - Automated cleanup jobs
   - Cache invalidation tasks
   - Data maintenance operations
   - Metrics collection
   - System health checks

6. **Schema Validation**
   - Zod schemas for request validation
   - Response type definitions
   - Runtime type checking
   - Automatic type inference
   - Reusable schema components

### 3. Testing

1. **Test Organization**
   - Tests mirror source structure
   - One test file per endpoint file
   - Shared test utilities
   - Clean database between tests
   - Mock data for consistent testing
   - Service-specific test suites

2. **Test Components**
   - `endpoints/` - API endpoint tests
   - `services/` - Service layer tests
   - `middleware/` - Middleware function tests
   - `utils/` - Utility function tests
   - `__mocks__/` - Mock implementations
   - `setup/` - Test environment configuration
   - `mockData.ts` - Shared test data

3. **Test Requirements**
   - Run type checking before tests
   - Test both success and error cases
   - Test authentication and authorization
   - Use dynamic API keys
   - Clean up test data
   - Use mock implementations where appropriate
   - Verify rate limiting behavior
   - Test scheduled operations
   - Validate schema enforcement

4. **Running Tests**
   ```bash
   npm run build        # Run type checking
   npm test            # Run all tests
   npm test <pattern>  # Run specific tests
   ```

5. **Test Data Management**
   - Use mock data for consistent testing
   - Dynamic data generation where needed
   - Cleanup after each test
   - Isolated test environments
   - Firebase emulator usage
   - Mock external services

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
   - Regular backups
   - Performance monitoring

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
   - IP-based limits with sliding windows
   - Fingerprint-based limits for authenticated requests
   - Configurable thresholds
   - Automatic cleanup of expired data
   - Rate limit logging and monitoring

3. **Data Access**
   - ROLE-based access control
   - Resource ownership verification
   - Input validation and sanitization
   - Output encoding
   - Error masking
   - SQL injection prevention
   - XSS prevention

### 7. Performance

1. **Caching Strategy**
   - In-memory caching for price data
   - 5-minute cache duration
   - Automatic invalidation
   - Cache size limits
   - Hit rate monitoring

2. **Request Processing**
   - Async operations
   - Parallel processing
   - Response streaming
   - Memory management
   - Connection pooling

3. **Scheduled Operations**
   - Automated cleanup runs daily
   - Cache invalidation every 5 minutes
   - Rate limit data cleanup
   - Visit history pruning
   - System metrics collection

### 8. Deployment

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

### 9. Monitoring

1. **Logging**
   - Request logging
   - Error logging
   - Rate limit tracking
   - Performance monitoring
   - Cache effectiveness

2. **Metrics**
   - Response times
   - Error rates
   - API key usage
   - Resource utilization
   - Cache hit rates
   - Database performance

## Contributing

1. Create a feature branch
2. Make changes
3. Run type checking
4. Run tests
5. Update documentation
6. Submit pull request

## Troubleshooting

1. **Common Issues**
   - API key validation failures
   - Rate limit exceeded
   - Cache invalidation
   - Database timeouts
   - Authentication errors

2. **Solutions**
   - Check logs
   - Verify configuration
   - Test locally
   - Review metrics
   - Clean test data

## Development Progress

### Current Features
- [x] Fingerprint management
- [x] Visit tracking
- [x] Presence monitoring
- [x] Impression analytics
- [x] Price data handling
- [x] Role management
- [x] Reality stability tracking
- [x] Rate limiting implementation
- [x] Caching system
- [x] Automated cleanup
- [x] Scheduled maintenance tasks
- [x] Schema validation system
- [x] Public asset serving
- [x] System health monitoring

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
- [x] Updated presence endpoints
- [x] Updated impression endpoints
- [x] Updated reality stability endpoints

### Future Improvements
- [ ] Enhanced analytics capabilities
- [ ] Improved caching mechanisms
- [ ] More granular permissions system
- [ ] Extended monitoring capabilities
- [ ] Performance optimizations
- [ ] Documentation updates

## [2024-01-18] - HIVEMIND System Implementation

### User System Tasks
- [x] Create `profile.service.ts`
  - [x] Profile CRUD operations
  - [x] Profile validation
  - [x] Contact info management
  - [x] Privacy settings
- [x] Create `capability.service.ts`
  - [x] Capability management
  - [x] Skill level tracking
  - [x] Capability validation
- [x] Create `stats.service.ts`
  - [x] Stats calculation
  - [x] Stats updates
  - [x] Historical tracking
- [x] Create `profile.endpoint.ts`
  - [x] POST /profile/create
  - [x] GET /profile/:id
  - [x] PATCH /profile/:id
  - [x] GET /profile/:id/stats
  - [x] POST /profile/:id/capability
  - [x] GET /profile/:id/capabilities

### Mission System Tasks (Future)
- [ ] Create `mission.service.ts`
  - [ ] Mission CRUD operations
  - [ ] Mission type validation
  - [ ] Requirements checking
  - [ ] Mission state management
- [ ] Create `verification.service.ts`
  - [ ] Verification processing
  - [ ] Auto-verification logic
  - [ ] Verification data storage
- [ ] Create `failure.service.ts`
  - [ ] Failure condition tracking
  - [ ] Failure record management
  - [ ] Dispute handling
- [ ] Create `mission.endpoint.ts`
  - [ ] POST /mission/create
  - [ ] GET /mission/:id
  - [ ] GET /missions
  - [ ] PATCH /mission/:id/status
  - [ ] POST /mission/:id/verify
  - [ ] POST /mission/:id/fail

### Implementation Order
1. User System (✓ Completed)
   - ✓ Profile service and endpoints
   - ✓ Capabilities
   - ✓ Stats tracking
2. Mission System (Next Focus)
   - Core mission functionality
   - Verification system
   - Failure handling

### Notes
- All new endpoints need proper validation schemas
- Follow existing patterns for service/endpoint structure
- Add tests for all new functionality
- Update API documentation as we go

## [2024-03-XX] - Wallet Authentication System Implementation

### Overview
Transitioning from API key-based authentication to wallet-based authentication with JWT tokens.
This change will allow users to claim their fingerprint data by connecting their Phantom wallet.

### Tasks

1. **Database Schema Updates**
   - [ ] Create `accounts` collection schema
     - Account-fingerprint relationships
     - Wallet address storage
     - JWT token management
   - [ ] Update `fingerprints` collection schema
     - Add account relationship
     - Maintain backwards compatibility
   - [ ] Define relationships between collections
   - [ ] Create Firestore rules for new schema

2. **Authentication System**
   - [ ] Create Phantom wallet authentication endpoint
   - [ ] Implement message signing/verification
   - [ ] Create JWT token generation and validation
   - [ ] Add Firebase custom claims for wallet addresses
   - [ ] Create account linking system (wallet -> fingerprints)

3. **Middleware Updates**
   - [ ] Remove API key middleware
   - [ ] Create JWT verification middleware
   - [ ] Update ownership verification middleware to use accounts
   - [ ] Update rate limiting to work with accounts

4. **Route Updates**
   - [ ] Update public routes
     - [ ] Keep fingerprint registration public
     - [ ] Keep basic tracking endpoints public
   - [ ] Update protected routes
     - [ ] Add JWT auth to data access endpoints
     - [ ] Update ownership checks
   - [ ] Add new auth routes
     - [ ] Wallet connection endpoint
     - [ ] Account management endpoints

5. **Testing**
   - [ ] Create test utilities for wallet auth
   - [ ] Update existing tests to remove API key dependencies
   - [ ] Add new tests for account system
   - [ ] Add integration tests for wallet flow

6. **Security & Validation**
   - [ ] Add request validation for new endpoints
   - [ ] Update error messages
   - [ ] Add rate limiting for auth endpoints
   - [ ] Add security headers

7. **Documentation**
   - [ ] Update API documentation
   - [ ] Add wallet integration guide
   - [ ] Update development guide
   - [ ] Add migration guide for existing users

8. **Client SDK Updates**
   - [ ] Add Phantom wallet integration
   - [ ] Update authentication flow
   - [ ] Add account management methods
   - [ ] Update error handling

### Implementation Notes
- Follow existing patterns in the codebase
- Maintain backwards compatibility during transition
- Implement changes incrementally
- Thoroughly test each component
- Document all changes and decisions