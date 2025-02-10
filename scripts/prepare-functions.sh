#!/bin/bash

# Navigate to functions directory
cd functions || exit

# Clean up any previous build artifacts
rm -rf lib deploy functions.zip

# Install dependencies
npm ci

# Create the zip file with source files
zip -r functions.zip . -x "node_modules/*" "coverage/*" "**/*.test.ts" "**/__tests__/*"

# Move the zip file to the parent directory
mv functions.zip ../
