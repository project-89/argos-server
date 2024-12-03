# IndraNet Cloud Functions

Backend serverless functions that power the IndraNet fingerprinting and tracking system within Project Argos.

## Overview

This package contains six core Cloud Functions that handle:
- Visit tracking and history
- Role management and assignment
- Tag management and updates
- Automatic role updates based on tags

## Functions

### Visit Management

#### `argosVisitLogger`
Records site visits with fingerprint tracking.

**Request:**
```json
{
  "fingerprintId": "string",
  "siteId": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

#### `argosGetVisitedSites`
Retrieves visit history for a fingerprint.

**Request:**
```json
{
  "fingerprintId": "string"
}
```

**Response:**
```json
{
  "sites": [
    {
      "id": "string",
      "fingerprintId": "string",
      "siteId": "string",
      "timestamp": "timestamp",
      "createdAt": "string"
    }
  ]
}
```

### Role Management

#### `argosAssignRole`
Manages role assignments from predefined roles:
- user
- agent-initiate
- agent-field
- agent-senior
- agent-master

**Request:**
```json
{
  "fingerprintId": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

Note: Only predefined roles are allowed. Any existing roles not in the predefined list will be filtered out.

#### `argosGetAvailableRoles`
Retrieves all available roles from the system.

**Response:**
```json
{
  "roles": [
    {
      "id": "string",
      ...doc.data()
    }
  ]
}
```

### Tag Management

#### `argosAddOrUpdateTags`
Updates tags for a fingerprint.

**Request:**
```json
{
  "fingerprintId": "string",
  "tags": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

#### `argosUpdateRolesBasedOnTags`
Automatically updates roles based on tag conditions.
We still need to add the dynamic role logic here.

**Request:**
```json
{
  "fingerprintId": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

Current Rules:
- TODO: Add dynamic role logic here

## Development

### Prerequisites
- Node.js 18 (required by package.json engines)
- Firebase CLI
- Google Cloud credentials
- Access to Firebase project (via [Firebase Console](https://console.firebase.google.com))

### Installation
```bash
npm install
```

### Available Scripts
```javascript:functions/package.json
startLine: 15
endLine: 22
```

### Local Development
1. Start the emulator:
```bash
npm run serve
```

2. Use the test script to verify endpoints:
```bash
../test-endpoints.sh
```

### Code Style
This project uses ESLint and Prettier for code formatting. Configuration files are provided:
- `eslint.config.js` - ESLint rules
- `.prettierrc.js` - Prettier configuration

### Required Database Indexes
For visit history queries:
```javascript:functions/visit-history.js
startLine: 27
endLine: 29
```

## Error Handling

All endpoints follow a consistent error response format:
```json
{
  "error": "Error message description"
}
```

Common errors:
- Missing fingerprintId
- Invalid tags object
- Database index not ready
- Fingerprint not found

## Security

- All functions require Firebase authentication
- Firestore rules enforce access control
- Role-based access control for sensitive operations
- Data validation on all inputs

## Deployment

Deploy all functions:
```bash
npm run deploy
```

Deploy a specific function:
```bash
firebase deploy --only functions:functionName
```

## Monitoring

View function logs:
```bash
npm run logs
```

---

For more information about the overall project, see the main [IndraNet README](../README.md).