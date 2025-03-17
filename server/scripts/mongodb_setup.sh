#!/bin/bash

# MongoDB setup script for GCP Compute Engine
# This script installs MongoDB 5.0 on Ubuntu 20.04

set -e

# Update and install dependencies
apt-get update
apt-get install -y gnupg curl

# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-5.0.gpg \
   --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-5.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update package database
apt-get update

# Install MongoDB packages
apt-get install -y mongodb-org

# Create MongoDB data directory if it doesn't exist
mkdir -p /data/db
chown -R mongodb:mongodb /data/db

# Configure MongoDB for external access (replace with secure config in production)
cat > /etc/mongod.conf << EOF
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where and how to store data.
storage:
  dbPath: /data/db
  journal:
    enabled: true

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 0.0.0.0  # Change to specific IP in production

# security
security:
  authorization: enabled

# replica set options
replication:
  replSetName: rs0
EOF

# Create MongoDB admin user
cat > /tmp/create_admin.js << EOF
db = db.getSiblingDB('admin');
db.createUser({
  user: "adminUser",
  pwd: "$(openssl rand -base64 24)",  // Random password - change in production
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
});
EOF

# Start MongoDB
systemctl enable mongod
systemctl start mongod

# Wait for MongoDB to start
sleep 10

# Initialize replica set (even for single instance)
mongosh --eval "rs.initiate()"
sleep 5

# Create admin user
mongosh admin /tmp/create_admin.js
rm /tmp/create_admin.js

# Create application database and user
cat > /tmp/create_app_user.js << EOF
db = db.getSiblingDB('admin');
db.auth('adminUser', '${ADMIN_PASSWORD}');

db = db.getSiblingDB('argosDB');
db.createUser({
  user: "argosUser",
  pwd: "$(openssl rand -base64 24)",  // Random password - change in production
  roles: [ { role: "readWrite", db: "argosDB" } ]
});

// Create initial indexes
db.agents.createIndex({ "capabilities": 1 });
db.visits.createIndex({ "fingerprintId": 1 });
db.visits.createIndex({ "createdAt": -1 });
db.profiles.createIndex({ "username": 1, "walletAddress": 1 }, { unique: true });
db.profiles.createIndex({ "bio": "text", "username": "text" });
EOF

mongosh admin /tmp/create_app_user.js
rm /tmp/create_app_user.js

echo "MongoDB setup complete!"

# Save credentials to file that can be accessed securely
cat > /root/mongodb_credentials.txt << EOF
MONGODB_ADMIN_USER=adminUser
MONGODB_ADMIN_PASSWORD=${ADMIN_PASSWORD}
MONGODB_APP_USER=argosUser
MONGODB_APP_PASSWORD=${APP_PASSWORD}
MONGODB_URL=mongodb://argosUser:${APP_PASSWORD}@localhost:27017/argosDB
EOF

chmod 600 /root/mongodb_credentials.txt

echo "Credentials saved to /root/mongodb_credentials.txt" 