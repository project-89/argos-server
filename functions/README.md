# Project 89: Argos Server Functions

Backend serverless functions that power the Argos fingerprinting and tracking system.

## Overview

This package contains several core Cloud Functions that handle:
- Visit tracking and presence management
- Role-based access control
- Dynamic tag management
- Reality stability monitoring
- Cryptocurrency price tracking
- API key management

## Functions

### Price and Reality Stability

#### `getTokenPrice`
Get historical price data for a specific token.

**Request:**
```
GET /price/:tokenId?timeframe=24h&interval=15m
```

**Response:**
```json
{
  "prices": [
    {
      "timestamp": "number",
      "price": "number"
    }
  ]
}
```

#### `fetchCryptoPrices`
Get current prices for multiple tokens.

**Request:**
```
GET /prices?symbols=project89,solana
```

**Response:**
```json
{
  "success": true,
  "prices": {
    "project89": {
      "usd": "number"
    }
  }
}
```

#### `calculateRealityStabilityIndex`
Calculate the current reality stability index.

**Request:**
```
GET /reality-stability
```

**Response:**
```json
{
  "realityStabilityIndex": "number",
  "resistanceLevel": "number",
  "metadata": {
    "currentPrice": "number",
    "shortTermChange": "number",
    "mediumTermChange": "number",
    "recentVolatility": "number",
    "resistanceImpact": "number",
    "simulationResponse": "number",
    "matrixIntegrity": "string",
    "timestamp": "number"
  }
}
```

### Visit Management

#### `logVisit`
Records site visits with fingerprint tracking.

**Request:**
```json
{
  "fingerprintId": "string",
  "timestamp": "number"
}
```

#### `updatePresence`
Updates presence status for a fingerprint.

**Request:**
```json
{
  "fingerprintId": "string",
  "timestamp": "number"
}
```

#### `removeSite`
Removes a site from presence tracking.

**Request:**
```json
{
  "fingerprintId": "string",
  "siteId": "string",
  "timestamp": "number"
}
```

### Role Management

#### `assignRole`
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

#### `getAvailableRoles`
Retrieves all available roles from the system.

**Response:**
```json
{
  "roles": [
    {
      "id": "string",
      "permissions": ["array"],
      "metadata": {}
    }
  ]
}
```

### Tag Management

#### `addOrUpdateTags`
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

#### `updateRolesBasedOnTags`
Automatically updates roles based on tag conditions.

**Request:**
```json
{
  "fingerprintId": "string"
}
```

### API Key Management

#### `createApiKey`
Creates a new API key for a fingerprint.

**Request:**
```json
{
  "fingerprintId": "string",
  "name?": "string",
  "metadata?": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "string",
    "fingerprintId": "string"
  }
}
```

#### `validateApiKey`
Validates an API key and updates usage statistics.

## Development

### Prerequisites
- Node.js 22 (required by package.json engines)
- Firebase CLI
- Google Cloud credentials
- Access to Firebase project

### Environment Setup
1. Copy the environment template:
```bash
cp ../.env.template ../.env
```

2. Update the .env file with your credentials

### Installation
```bash
npm install
```

### Available Scripts
- `npm run serve` - Start local emulator
- `npm run deploy` - Deploy functions
- `npm run logs` - View function logs
- `npm run logs:watch` - Watch function logs
- `npm run env:sync` - Sync environment variables
- `npm run generate-key` - Generate new API key

### Local Development
1. Start the emulator:
```bash
npm run serve
```

2. Test endpoints:
```bash
../test-endpoints.sh
```

### Code Style
ESLint and Prettier configuration provided:
- `eslint.config.js`
- `.prettierrc.js`

## Security

- API key authentication required for most endpoints
- Firestore security rules
- Role-based access control
- Input validation on all endpoints
- Rate limiting on price endpoints

## Error Handling

Standard error response format:
```json
{
  "error": "Error message description"
}
```

Common errors:
- Missing or invalid API key
- Invalid fingerprintId
- Rate limit exceeded
- Invalid input data
- Resource not found

## Deployment

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:functionName
```

## Monitoring

```bash
# View logs
npm run logs

# Watch logs
npm run logs:watch
```

---

For more information about the overall project, see the main [README](../README.md).