# Project 89: Argos Server 🔍

A sophisticated cloud-based fingerprinting and tracking system built with Firebase Cloud Functions and Terraform.

## Overview

Argos Server is a secure, scalable fingerprinting and tracking system. It manages user fingerprints, visits, roles, and tags through a series of serverless functions, using Firebase Cloud Functions for backend operations and Terraform for infrastructure management.

## Features

- 🔐 Secure fingerprint management
- 📍 Visit tracking and logging
- 👤 Role-based access control
- 🏷️ Dynamic tagging system
- 🔄 Automatic role updates based on tags
- ⚡ Serverless architecture

## Architecture

The system consists of several key components:

- **Firebase Cloud Functions**: Handles all backend operations
  - Visit logging and tracking
  - Role management and assignment
  - Tag management
  - Automatic role updates based on tags
- **Firestore**: Database for storing fingerprints, visits, and roles
  - Custom security rules for data protection
  - Required indexes for efficient querying
- **Terraform**: Infrastructure as Code for deployment
- **Security Rules**: Custom Firestore rules for data protection

## Prerequisites

- Node.js 18.x
- Firebase CLI
- Terraform >= 1.0
- Google Cloud SDK
- Firebase Project

## Setup

1. Clone the repository:
```bash
git clone https://github.com/project-89/argos-server
cd argos-server
```

2. Install dependencies:
```bash
cd functions
npm install
```

## Configuration

### Setting up Google Cloud Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to "IAM & Admin" > "Service Accounts"
4. Click "Create Service Account"
5. Name your service account (e.g., "argos-dev")
6. Grant the following roles:
   - Cloud Functions Developer
   - Firebase Admin
   - Cloud Datastore User
   - Service Account User
7. Click "Create Key" and select JSON format
8. Save the downloaded JSON file securely

### Environment Setup

1. Copy the environment template:
```bash
cp .env.template .env
```

2. Update the .env file with your credentials path:
```bash
GOOGLE_APPLICATION_CREDENTIALS="path/to/your/credentials.json"
```

> **Security Notes**: 
> - Never commit service account JSON files to version control
> - Keep your credentials secure and rotate them regularly
> - For production deployments, use secret management services

### Required Firestore Indexes
```
Collection: visits
Fields: 
  - fingerprintId (ASC)
  - timestamp (DESC)
```

## Deployment

### Firebase Functions

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
npm run deploy:function <function-name>
```

### Infrastructure

```bash
cd terraform
terraform init
terraform plan    # Review changes
terraform apply   # Apply infrastructure changes
```

## API Documentation

Detailed API documentation can be found in the [API.md](./docs/API.md) file.

### Key Endpoints

- `/fingerprint` - Manage fingerprint operations
- `/visits` - Track and log visits
- `/roles` - Handle role assignments
- `/tags` - Manage tagging system

## Security

- All endpoints require authentication
- Data is encrypted at rest and in transit
- Role-based access control (RBAC) implemented
- Regular security audits performed

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test <suite-name>

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository.

## Project Status

🟢 Active Development

---

Built with ❤️ by ONEIROCOM

## Tag-to-Role Update Logic

### Overview
The system automatically updates user roles based on their tags through two main components:
- `auto-update-roles.js`: Triggers on fingerprint document updates
- `update-role-by-tags.js`: Contains the logic for role assignment

### Adding New Role Logic

1. Open `functions/update-role-by-tags.js`
2. Locate the TODO section in the `updateRolesBasedOnTags` function:

```javascript
// Example role logic implementation:
const tags = data.tags || {};
let roles = data.roles || [];

// Add your conditions here
if (tags.puzzle_solved >= 3 && !roles.includes("puzzle_master")) {
  roles.push("puzzle_master");
}

if (tags.sites_visited >= 10 && !roles.includes("explorer")) {
  roles.push("explorer");
}
```

### Role Logic Guidelines

- Each condition should check for specific tag values
- Always verify the role doesn't already exist using `!roles.includes()`
- Use descriptive role names that reflect the achievement
- Consider tag combinations for advanced roles

Example tag-role mappings:
```javascript
// Basic achievements
if (tags.login_count >= 5) addRole("regular_user")
if (tags.posts_created >= 3) addRole("contributor")

// Combined achievements
if (tags.puzzle_solved >= 3 && tags.login_streak >= 7) addRole("dedicated_solver")

// Progressive roles
if (tags.mission_complete >= 1) addRole("agent-initiate")
if (tags.mission_complete >= 5) addRole("agent-field")
if (tags.mission_complete >= 10) addRole("agent-senior")
```

### Testing Role Updates

1. Update a fingerprint's tags:
```bash
curl -X POST https://your-function-url/argosAddOrUpdateTags \
  -d '{"fingerprintId": "test123", "tags": {"puzzle_solved": 3}}'
```

2. The system will automatically:
   - Trigger `autoUpdateRolesOnTagChange`
   - Process the new tags
   - Update roles if conditions are met

### Monitoring Role Changes

Monitor role updates through Firebase Console:
1. Navigate to Functions > Logs
2. Filter for "autoUpdateRolesOnTagChange"
3. Look for log entries showing tag processing and role updates
```

</rewritten_file>