#!/bin/bash

# Deployment Verification Script
# Usage: ./verify-deployment.sh [testnet|mainnet] [deployer-address]

set -e

NETWORK=${1:-testnet}
DEPLOYER=${2}

if [ -z "$DEPLOYER" ]; then
    echo "❌ Please provide deployer address"
    echo "Usage: ./verify-deployment.sh [testnet|mainnet] [deployer-address]"
    exit 1
fi

echo "🔍 Verifying deployment on $NETWORK for $DEPLOYER..."

# Set API endpoint
if [ "$NETWORK" == "mainnet" ]; then
    API="https://stacks-node-api.mainnet.stacks.co"
else
    API="https://stacks-node-api.testnet.stacks.co"
fi

# List of contracts to verify
CONTRACTS=("sip-009-trait" "sip-010-trait" "pay-per-view" "subscription" "content-gate")

echo ""
echo "📋 Checking deployed contracts..."
echo "=================================="

for CONTRACT in "${CONTRACTS[@]}"; do
    echo -n "Checking $CONTRACT... "
    
    RESPONSE=$(curl -s "$API/v2/contracts/interface/$DEPLOYER/$CONTRACT")
    
    if echo "$RESPONSE" | grep -q "\"functions\""; then
        echo "✅ Deployed"
    else
        echo "❌ Not found"
    fi
done

echo ""
echo "=================================="
echo "✅ Verification complete!"
