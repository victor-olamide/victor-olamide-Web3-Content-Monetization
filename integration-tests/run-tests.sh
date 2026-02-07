#!/bin/bash

# Integration Test Runner Script

set -e

echo "🧪 Running Integration Tests on Stacks Testnet..."
echo ""

# Check environment
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run ./setup.sh first"
    exit 1
fi

# Parse command line arguments
TEST_SUITE=${1:-all}

case $TEST_SUITE in
  ppv)
    echo "Running Pay-Per-View tests..."
    npm test -- scenarios/pay-per-view.test.js
    ;;
  subscription)
    echo "Running Subscription tests..."
    npm test -- scenarios/subscription.test.js
    ;;
  gating)
    echo "Running Token Gating tests..."
    npm test -- scenarios/token-gating.test.js
    ;;
  backend)
    echo "Running Backend API tests..."
    npm test -- scenarios/backend-api.test.js
    ;;
  e2e)
    echo "Running End-to-End Journey tests..."
    npm test -- scenarios/e2e-journey.test.js
    ;;
  all)
    echo "Running all integration tests..."
    npm test
    ;;
  *)
    echo "Unknown test suite: $TEST_SUITE"
    echo "Usage: ./run-tests.sh [ppv|subscription|gating|backend|e2e|all]"
    exit 1
    ;;
esac

echo ""
echo "✅ Tests completed!"
