# Argos Server - Development Guidelines

## Project Structure
```typescript
functions/
├── src/
│   ├── constants/     // Global constants and configurations
│   ├── endpoints/     // API endpoint handlers
│   ├── middleware/    // Express middleware
│   ├── routes/        // Route definitions and organization
│   ├── schemas/       // Request/response schemas
│   ├── services/      // Business logic implementation
│   ├── test/          // Test suites
│   ├── types/         // TypeScript type definitions
│   └── utils/         // Helper functions
├── scripts/           // Development and deployment scripts
└── package.json       // Dependencies and scripts
```

## Development Setup

### Prerequisites
- Node.js 18+
- Firebase CLI
- TypeScript 4.9+

### Environment Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   - Copy `.env.development` for local development
   - Copy `.env.test` for testing
   - Copy `.env.production` for production

### Local Development
1. Start Firebase emulators:
   ```bash
   npm run serve
   ```
2. Run tests:
   ```bash
   npm run test
   ```
3. Type checking:
   ```bash
   npm run type-check
   ```

## Testing Guidelines

### Test Structure
- Tests mirror the source directory structure
- Each endpoint has a corresponding test file
- Integration tests use Firebase emulators
- Cleanup after each test suite

### Test Categories
1. Unit Tests
   - Service functions
   - Utility functions
   - Middleware functions

2. Integration Tests
   - API endpoints
   - Authentication flows
   - Rate limiting
   - Data persistence

3. End-to-End Tests
   - Complete user journeys
   - Cross-service interactions

### Test Best Practices
- Use dynamic test data
- Clean up after tests
- Mock external services
- Test error cases
- Verify rate limiting
- Check authentication

## Code Standards

### TypeScript Guidelines
- Use strict type checking
- Avoid `any` types
- Document complex types
- Use interfaces for objects
- Leverage type inference

### Function Guidelines
- Single responsibility
- Clear return types
- Error handling
- Input validation
- Documentation

### Middleware Guidelines
- Composable design
- Error propagation
- Request validation
- Performance optimization

### Service Guidelines
- Business logic isolation
- Database abstraction
- Error handling
- Caching strategy
- Rate limit compliance

## Security Practices

### Authentication
- API key validation
- Role-based access
- Request signing
- Token management

### Data Protection
- Input sanitization
- Output encoding
- SQL injection prevention
- XSS prevention

### Rate Limiting
- IP-based limits
- Fingerprint-based limits
- Sliding window algorithm
- Limit bypass prevention

## Performance Optimization

### Caching Strategy
- In-memory caching
- Cache invalidation
- Cache duration
- Cache size limits

### Database Optimization
- Index usage
- Query optimization
- Batch operations
- Connection pooling

### Request Processing
- Async operations
- Parallel processing
- Response streaming
- Memory management

## Deployment

### Staging Process
1. Run tests
2. Type checking
3. Lint checking
4. Build verification
5. Environment validation

### Production Deployment
1. Version tagging
2. Environment setup
3. Database migrations
4. Function deployment
5. Smoke tests

### Monitoring
- Error tracking
- Performance metrics
- Rate limit monitoring
- Cache effectiveness

## Maintenance

### Regular Tasks
- Dependency updates
- Security patches
- Performance review
- Code cleanup

### Database Maintenance
- Data cleanup
- Index optimization
- Backup verification
- Schema updates

### Documentation
- API documentation
- Code comments
- Type definitions
- Change logs

## Current State

### Active Features
- Fingerprint management
- Visit tracking
- Presence monitoring
- Impression analytics
- Price data handling
- Role management
- Reality stability tracking

### Monitoring Points
- Rate limit thresholds
- Cache hit rates
- Error rates
- Response times
- Database performance

### Known Limitations
- Rate limit persistence
- Cache size constraints
- Long-running queries
- Concurrent updates

## Future Improvements

### Planned Features
- Enhanced analytics
- Better caching
- More granular permissions
- Extended monitoring

### Technical Debt
- Test coverage gaps
- Documentation updates
- Performance optimizations
- Error handling improvements

## Support

### Debug Tools
- Firebase emulators
- Test utilities
- Logging system
- Metrics dashboard

### Common Issues
- Rate limit exceeded
- Cache invalidation
- Database timeouts
- Authentication errors

### Resolution Steps
1. Check logs
2. Verify configuration
3. Test locally
4. Review metrics
5. Update documentation
``` 