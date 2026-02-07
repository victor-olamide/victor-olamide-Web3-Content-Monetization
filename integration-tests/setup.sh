#!/bin/bash

# Integration Test Environment Setup Script

set -e

echo "🔧 Setting up integration test environment..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from example..."
    cat > .env << 'EOF'
BACKEND_API=http://localhost:5000/api
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
DEPLOYER_KEY=your_deployer_private_key
CREATOR_KEY=your_creator_private_key
USER1_KEY=your_user1_private_key
USER2_KEY=your_user2_private_key
EOF
    echo "⚠️  Please update .env with your testnet private keys"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if backend is running
echo "🔍 Checking backend service..."
if curl -s http://localhost:5000/api/status > /dev/null; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is not running. Please start it with:"
    echo "   cd ../backend && npm start"
fi

# Check Stacks testnet connectivity
echo "🌐 Checking Stacks testnet connectivity..."
if curl -s https://stacks-node-api.testnet.stacks.co/v2/info > /dev/null; then
    echo "✅ Stacks testnet is accessible"
else
    echo "❌ Cannot connect to Stacks testnet"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your testnet private keys"
echo "2. Ensure backend is running: cd ../backend && npm start"
echo "3. Run tests: npm test"
