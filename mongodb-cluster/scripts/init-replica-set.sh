#!/usr/bin/env bash

# MongoDB Replica Set Initialization Script
# This script initializes the MongoDB replica set with primary, secondaries, and arbiter

set -e

echo "Waiting for all MongoDB nodes to be ready..."
sleep 30

echo "Initializing MongoDB Replica Set..."

# Wait for primary to be ready
until mongosh --host mongodb-primary --eval "db.adminCommand('ping')" &>/dev/null; do
  echo "Waiting for mongodb-primary..."
  sleep 5
done

# Wait for secondaries to be ready
until mongosh --host mongodb-secondary1 --eval "db.adminCommand('ping')" &>/dev/null; do
  echo "Waiting for mongodb-secondary1..."
  sleep 5
done

until mongosh --host mongodb-secondary2 --eval "db.adminCommand('ping')" &>/dev/null; do
  echo "Waiting for mongodb-secondary2..."
  sleep 5
done

# Wait for arbiter to be ready
until mongosh --host mongodb-arbiter --eval "db.adminCommand('ping')" &>/dev/null; do
  echo "Waiting for mongodb-arbiter..."
  sleep 5
done

echo "All MongoDB nodes are ready. Initializing replica set..."

# Initialize replica set configuration
mongosh --host mongodb-primary <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongodb-primary:27017",
      priority: 3,
      tags: { "nodeType": "primary" }
    },
    {
      _id: 1,
      host: "mongodb-secondary1:27017",
      priority: 2,
      tags: { "nodeType": "secondary" }
    },
    {
      _id: 2,
      host: "mongodb-secondary2:27017",
      priority: 2,
      tags: { "nodeType": "secondary" }
    },
    {
      _id: 3,
      host: "mongodb-arbiter:27017",
      priority: 1,
      arbiterOnly: true,
      tags: { "nodeType": "arbiter" }
    }
  ],
  settings: {
    electionTimeoutMillis: 5000,
    heartbeatTimeoutSecs: 10,
    catchUpTimeoutMillis: 60000
  }
});
EOF

echo "Replica set initiated. Waiting for configuration to propagate..."
sleep 10

# Verify replica set status
echo "Verifying replica set configuration..."
mongosh --host mongodb-primary --eval "rs.status()" | head -20

# Create application user
echo "Creating application database user..."
mongosh --host mongodb-primary <<EOF
use web3content;
db.createUser({
  user: "web3app",
  pwd: "web3app_password_123",
  roles: [
    { role: "readWrite", db: "web3content" },
    { role: "dbAdmin", db: "web3content" },
    { role: "read", db: "admin" }
  ]
});
EOF

echo "MongoDB replica set initialization completed successfully!"
echo "Primary node: mongodb-primary:27017"
echo "Secondary nodes: mongodb-secondary1:27017, mongodb-secondary2:27017"
echo "Arbiter node: mongodb-arbiter:27017"
echo "Config server: mongodb-config:27017"