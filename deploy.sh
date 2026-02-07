#!/bin/bash

# Automated Clarinet Deployment Script
# Usage: ./deploy.sh [testnet|mainnet]

set -e

NETWORK=${1:-testnet}

echo "🚀 Starting deployment to $NETWORK..."

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "❌ Clarinet is not installed. Please install it first."
    echo "Visit: https://github.com/hirosystems/clarinet"
    exit 1
fi

# Validate network
if [[ "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]]; then
    echo "❌ Invalid network. Use 'testnet' or 'mainnet'"
    exit 1
fi

# Check if deployment plan exists
PLAN_FILE="deployments/${NETWORK}.plan.yaml"
if [ ! -f "$PLAN_FILE" ]; then
    echo "❌ Deployment plan not found: $PLAN_FILE"
    exit 1
fi

# Run tests before deployment
echo "🧪 Running contract tests..."
clarinet test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

echo "✅ All tests passed!"

# Check contracts
echo "📝 Checking contracts..."
clarinet check

if [ $? -ne 0 ]; then
    echo "❌ Contract check failed. Aborting deployment."
    exit 1
fi

echo "✅ Contract check passed!"

# Deploy to network
echo "🌐 Deploying to $NETWORK..."
clarinet deployments apply -p "$PLAN_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Deployment to $NETWORK completed successfully!"
    echo "📋 Check deployment status with: clarinet deployments status"
else
    echo "❌ Deployment failed!"
    exit 1
fi
