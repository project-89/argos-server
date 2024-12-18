#!/bin/bash

# Base URL for local emulator
BASE_URL="http://127.0.0.1:5001/argos-434718/us-central1/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting endpoint tests..."

# Test fingerprint registration
echo -e "\n${GREEN}Testing fingerprint registration...${NC}"
FINGERPRINT_RESPONSE=$(curl -s -X POST "$BASE_URL/register-fingerprint" \
-H "Content-Type: application/json" \
-d '{
  "fingerprint": "test-browser-fingerprint",
  "metadata": {
    "userAgent": "test-agent",
    "platform": "test"
  }
}')
FINGERPRINT_ID=$(echo $FINGERPRINT_RESPONSE | jq -r '.fingerprintId')
echo "Fingerprint Response: $FINGERPRINT_RESPONSE"

# Test get fingerprint
echo -e "\n${GREEN}Testing get fingerprint...${NC}"
curl -s -X GET "$BASE_URL/get-fingerprint/$FINGERPRINT_ID"

# Test presence tracking
echo -e "\n${GREEN}Testing log visit...${NC}"
curl -s -X POST "$BASE_URL/log-visit" \
-H "Content-Type: application/json" \
-H "x-api-key: $API_KEY" \
-d "{
  \"fingerprintId\": \"$FINGERPRINT_ID\",
  \"siteId\": \"test-site\"
}"

echo -e "\n${GREEN}Testing update presence...${NC}"
curl -s -X POST "$BASE_URL/update-presence" \
-H "Content-Type: application/json" \
-d "{
  \"fingerprintId\": \"$FINGERPRINT_ID\"
}"

echo -e "\n${GREEN}Testing remove site...${NC}"
curl -s -X POST "$BASE_URL/remove-site" \
-H "Content-Type: application/json" \
-d "{
  \"fingerprintId\": \"$FINGERPRINT_ID\",
  \"siteId\": \"test-site\"
}"

# Test API key registration
echo -e "\n${GREEN}Testing API key registration...${NC}"
API_KEY_RESPONSE=$(curl -s -X POST "$BASE_URL/register-api-key" \
-H "Content-Type: application/json" \
-d "{
  \"name\": \"Test API Key\",
  \"fingerprintId\": \"$FINGERPRINT_ID\",
  \"metadata\": {
    \"purpose\": \"testing\"
  }
}")
API_KEY=$(echo $API_KEY_RESPONSE | jq -r '.apiKey')
echo "API Key Response: $API_KEY_RESPONSE"

# Test price endpoints with different intervals
echo -e "\n${GREEN}Testing price endpoint with minutely data...${NC}"
curl -s -X GET "$BASE_URL/price/project89?timeframe=24h&interval=1m" \
-H "x-api-key: $API_KEY"

echo -e "\n${GREEN}Testing price endpoint with 15m intervals...${NC}"
curl -s -X GET "$BASE_URL/price/project89?timeframe=24h&interval=15m" \
-H "x-api-key: $API_KEY"

echo -e "\n${GREEN}Testing price endpoint with hourly data...${NC}"
curl -s -X GET "$BASE_URL/price/project89?timeframe=7d&interval=1h" \
-H "x-api-key: $API_KEY"

echo -e "\n${GREEN}Testing prices endpoint...${NC}"
curl -s -X GET "$BASE_URL/prices?symbols=project89,solana" \
-H "x-api-key: $API_KEY"

# Test reality stability (public endpoint)
echo -e "\n${GREEN}Testing reality stability endpoint...${NC}"
curl -s -X GET "$BASE_URL/reality-stability"

echo -e "\n${GREEN}All endpoints tested.${NC}"

# Cleanup
echo -e "\n${GREEN}Test complete. Fingerprint ID: $FINGERPRINT_ID, API Key: $API_KEY${NC}"
