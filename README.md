# Project 89: Argos Server 🔍

A sophisticated cloud-based fingerprinting and tracking system built with Firebase Cloud Functions, TypeScript, and Terraform.

## Overview

Argos Server is a secure, scalable fingerprinting and tracking system designed for Project89. It provides comprehensive user tracking, role management, and price monitoring capabilities through a set of well-tested serverless functions. Built with infrastructure as code principles, it ensures consistent deployment and scalability.

## Features

- 🔐 Secure API Key Management
- 👆 Fingerprint Registration & Tracking
- 💰 Project89 Token Price Monitoring
- 📊 Reality Stability Index
- 👤 Role-based Access Control
- 🏷️ Dynamic Tag System
- 📍 Visit & Presence Tracking
- 🧪 100% Test Coverage
- ⚡ TypeScript & Firebase
- 🏗️ Infrastructure as Code with Terraform
- 📦 Automated Deployments
- 🔄 CI/CD Integration

## Architecture

The system consists of several key components:

### Backend Services
- **Firebase Cloud Functions**: Handles all backend operations
  - Visit logging and tracking
  - Role management and assignment
  - Tag management
  - Price monitoring
  - Reality stability calculations

### Data Storage
- **Firestore**: NoSQL database for storing
  - Fingerprints
  - Visit history
  - Role assignments
  - API keys
  - Price cache
  - Custom security rules

### Infrastructure
- **Terraform**: Infrastructure as Code
  - Firebase project configuration
  - Service account management
  - Security rules deployment
  - Function deployment settings
  - Environment configuration

### Security
- **Firebase Auth**: Authentication and authorization
- **Custom Middleware**: Rate limiting and API key validation
- **Security Rules**: Custom Firestore rules for data protection

## API Documentation

### Authentication
All endpoints except those marked as public require an API key in the `x-api-key` header.

### Public Endpoints
The following endpoints are publicly accessible:
- `/fingerprint/register`
- `/apiKey/register`
- `/price/current`
- `/price/history`
- `/reality-stability`

### API Key Management
#### POST /apiKey/register
Register a new API key.
- Body: `{ fingerprintId: string }`
- Returns: `{ success: true, data: { key: string, fingerprintId: string } }`

#### POST /apiKey/validate
Validate an API key.
- Body: `{ key: string }`
- Returns: `{ success: true, data: { isValid: boolean, fingerprintId?: string } }`

#### POST /apiKey/revoke
Revoke an existing API key.
- Body: `{ key: string }`
- Returns: `{ success: true, data: { message: string } }`

### Fingerprint Management
#### POST /fingerprint/register
Register a new fingerprint.
- Body: `{ fingerprint: string, metadata?: object }`
- Returns: `{ success: true, data: { id: string, fingerprint: string, ... } }`

#### GET /fingerprint/:id
Get fingerprint details.
- Returns: `{ success: true, data: { id: string, fingerprint: string, ... } }`

### Price Information
#### GET /price/current
Get current Project89 token price.
- Query: `?symbols=Project89` (optional)
- Returns: `{ success: true, data: { Project89: { usd: number, usd_24h_change: number } } }`

#### GET /price/history/:tokenId
Get price history for Project89 token.
- Returns: Array of price data points with timestamps

### Reality Stability
#### GET /reality-stability
Get the current reality stability index.
- Returns: `{ success: true, data: { stabilityIndex: number, currentPrice: number, ... } }`

### Role Management
#### POST /role/assign
Assign a role to a fingerprint.
- Body: `{ fingerprintId: string, role: string }`
- Returns: `{ success: true, data: { fingerprintId: string, role: string, roles: string[] } }`

#### POST /role/remove
Remove a role from a fingerprint.
- Body: `{ fingerprintId: string, role: string }`
- Returns: `{ success: true, data: { fingerprintId: string, role: string, roles: string[] } }`

#### GET /role/available
Get list of available roles.
- Returns: `{ success: true, data: string[] }`

### Tag Management
#### POST /tag/update
Update tags for a fingerprint.
- Body: `{ fingerprintId: string, tags: object }`
- Returns: `{ success: true, data: { fingerprintId: string, tags: object } }`

#### POST /tag/roles/update
Update roles based on tag rules.
- Body: `{ fingerprintId: string, tagRules: object }`
- Returns: `{ success: true, data: { fingerprintId: string, roles: string[] } }`

### Visit Tracking
#### POST /visit/log
Log a new visit.
- Body: `{ fingerprintId: string, url: string }`
- Returns: `{ success: true, data: { id: string, ... } }`

#### POST /visit/presence
Update presence status.
- Body: `{ fingerprintId: string, status: string }`
- Returns: `{ success: true, data: { fingerprintId: string, status: string } }`

#### POST /visit/site/remove
Remove a site from tracking.
- Body: `{ fingerprintId: string, siteId: string }`
- Returns: `{ success: true, data: { message: string } }`

#### GET /visit/history/:fingerprintId
Get visit history for a fingerprint.
- Returns: `{ success: true, data: Visit[] }`

### Debug Endpoints
#### POST /debug/cleanup
Run cleanup operations (protected endpoint).
- Returns: `{ success: true, data: { total: number, ... } }`

## Development Setup

### Prerequisites
- Node.js 18.x or higher
- Firebase CLI
- Terraform >= 1.0
- Google Cloud SDK
- Firebase Project
- Access to Google Cloud Console

### Local Development Setup

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd argos-server
\`\`\`

2. Install dependencies:
\`\`\`bash
cd functions
npm install
\`\`\`

3. Set up environment:
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

### Infrastructure Setup

1. Initialize Terraform:
\`\`\`bash
cd terraform
terraform init
\`\`\`

2. Configure Google Cloud credentials:
\`\`\`bash
# Set up application default credentials
gcloud auth application-default login

# Or use a service account key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
\`\`\`

3. Plan and apply infrastructure:
\`\`\`bash
terraform plan    # Review changes
terraform apply   # Apply infrastructure changes
\`\`\`

### Running Locally
\`\`\`bash
npm run serve
\`\`\`

### Testing
All endpoints have comprehensive test coverage:
\`\`\`bash
npm test                     # Run all tests
npm run test:coverage        # Run tests with coverage
npm test <pattern>          # Run specific tests
\`\`\`

Current test status:
- ✅ API Key Endpoints (9 tests)
- ✅ Fingerprint Endpoints (5 tests)
- ✅ Price Endpoints (6 tests)
- ✅ Reality Stability Endpoints (2 tests)
- ✅ Role Endpoints (6 tests)
- ✅ Tag Endpoints (6 tests)
- ✅ Visit Endpoints (8 tests)
- ✅ Debug Endpoints (2 tests)

Total: 46 tests passing

### Deployment

1. Deploy infrastructure:
\`\`\`bash
cd terraform
terraform apply
\`\`\`

2. Deploy functions:
\`\`\`bash
cd functions
npm run deploy              # Deploy all functions
npm run deploy:function <name>  # Deploy specific function
\`\`\`

## Security Features

- 🔒 API Key Authentication
- 🚦 Rate Limiting
- 🔐 Role-Based Access Control
- 🛡️ Request Validation
- 📝 Comprehensive Logging
- 🧹 Automated Cleanup
- 🔐 Secure Infrastructure Configuration
- 📜 Audit Logging

## Error Handling

All endpoints follow a consistent error response format:
\`\`\`json
{
  "success": false,
  "error": "Descriptive error message"
}
\`\`\`

Common HTTP status codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (invalid/missing API key)
- 404: Not Found
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Make your changes
4. Run tests (\`npm test\`)
5. Commit your changes (\`git commit -m 'Add amazing feature'\`)
6. Push to the branch (\`git push origin feature/amazing-feature\`)
7. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow TypeScript best practices
- Use consistent error handling
- Document new endpoints
- Update infrastructure code as needed

## Required Firestore Indexes

\`\`\`
Collection: visits
Fields: 
  - fingerprintId (ASC)
  - timestamp (DESC)

Collection: fingerprints
Fields:
  - enabled (ASC)
  - createdAt (DESC)
\`\`\`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security Considerations

When deploying this project:
- Never commit service account keys
- Rotate API keys regularly
- Monitor rate limits
- Review security rules
- Keep dependencies updated
- Enable audit logging
- Use secure communication

## Support

For support:
1. Check the documentation
2. Search existing issues
3. Open a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## Project Status

🟢 Active Development

---

Built with ❤️ by ONEIROCOM