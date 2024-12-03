#!/bin/bash

# Directory containing the Cloud Functions code
FUNCTIONS_DIR="functions"
SRC_DIR="$FUNCTIONS_DIR/src"

# Output file for the zipped functions
ZIP_FILE="functions.zip"

# Step 1: Ensure the functions directory exists
if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "Error: $FUNCTIONS_DIR directory not found."
  exit 1
fi

# Step 2: Install dependencies
echo "Installing dependencies..."
cd "$FUNCTIONS_DIR" || exit
npm install --production

# Step 3: Go back to the root directory
cd .. || exit

# Step 4: Create temporary directory with proper structure
TEMP_DIR="temp_functions"
mkdir -p "$TEMP_DIR/src"

echo "Copying files to temporary directory for zipping..."
# Copy package files
cp "$FUNCTIONS_DIR/package.json" "$TEMP_DIR/"
cp "$FUNCTIONS_DIR/package-lock.json" "$TEMP_DIR/" 2>/dev/null || :

# Copy src directory structure
cp -R "$SRC_DIR"/* "$TEMP_DIR/src/"

# Copy node_modules
cp -R "$FUNCTIONS_DIR/node_modules" "$TEMP_DIR/"

# Step 5: Create the ZIP file
echo "Zipping function files..."
cd "$TEMP_DIR" || exit
zip -r "../$ZIP_FILE" .

# Step 6: Confirm success
if [ -f "../$ZIP_FILE" ]; then
  echo "Functions successfully prepared: $ZIP_FILE"
else
  echo "Error: Failed to create $ZIP_FILE"
  exit 1
fi

# Step 7: Clean up
cd ..
rm -rf "$TEMP_DIR"

echo "You can now deploy using Terraform."
