# Argos Server

A Firebase Functions-based API server for fingerprinting, visit tracking, and pricing operations.

## Overview

Argos Server provides a secure and scalable API for:
- Browser fingerprinting and tracking
- Visit and presence monitoring
- Price data aggregation
- Role-based access control
- Reality stability tracking
- Analytics and impressions

## System Architecture

### Core Components
- Firebase Functions (Node.js 18)
- Firestore Database
- Cloud Scheduler
- Cloud Pub/Sub
- In-memory Caching

### Request Flow
1. All requests go through CORS and basic Express middleware
2. Requests are routed to one of three routers:
   - Public Router: No auth required, rate-limited
   - Protected Router: Requires API key, ownership verification
   - Admin Router: Requires API key and admin role

### Security Features
- API key authentication
- Role-based access control
- Resource ownership verification
- IP-based rate limiting
- Request validation
- Data encryption

## Infrastructure

### Cloud Services
- **Firebase Functions**: API endpoints and business logic
- **Firestore**: Document database for all data
- **Cloud Scheduler**: Automated maintenance tasks
- **Cloud Pub/Sub**: Event handling and async operations
- **Firebase Auth**: (Optional) User authentication

### System Requirements
- Node.js 18+
- Firebase CLI
- Google Cloud SDK
- Terraform (optional, for infrastructure management)

## Getting Started

### Local Development Setup
1. Clone the repository
   ```bash
   git clone <repository-url>
   cd argos-server
   ```

2. Install dependencies
   ```bash
   npm install
   cd functions
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.template .env
   cp functions/.env.development .env.development
   ```

4. Start development server
   ```bash
   firebase emulators:start
   ```

### Environment Configuration
Required environment variables:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_REGION`: Deployment region (default: us-central1)
- `COINGECKO_API_KEY`: API key for price data
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `RATE_LIMIT_DISABLED`: Disable rate limiting (development only)
- `IP_RATE_LIMIT_DISABLED`: Disable IP-based rate limiting (development only)

### Deployment
1. Build the project
   ```bash
   cd functions
   npm run build
   ```

2. Deploy to Firebase
   ```bash
   firebase deploy --only functions
   ```

## Documentation

- [API Documentation](functions/README.md): Detailed API endpoints and usage
- [Development Guidelines](DEVELOPMENT.md): Development rules and best practices
- [Contributing Guidelines](CONTRIBUTING.md): How to contribute to the project

## Contributing

1. Follow existing patterns
2. Write tests for new features
3. Update documentation
4. Run full test suite before submitting
5. Follow file naming conventions:
   - Services: `*.service.ts`
   - Middleware: `*.middleware.ts`
   - Endpoints: `*.endpoint.ts`

## License

MIT License - see [LICENSE](LICENSE) for details.

This is an open source project by Oneirocom.