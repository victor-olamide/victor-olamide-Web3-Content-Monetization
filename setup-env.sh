#!/bin/bash

# Environment Setup Script for Clarinet
# Usage: ./setup-env.sh

set -e

echo "🔧 Setting up Clarinet environment..."

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "📦 Installing Clarinet..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install clarinet
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
        sudo mv clarinet /usr/local/bin/
    else
        echo "❌ Unsupported OS. Please install Clarinet manually."
        exit 1
    fi
fi

echo "✅ Clarinet installed: $(clarinet --version)"

# Create cache directory
mkdir -p .cache
mkdir -p cache

# Copy example settings if they don't exist
if [ ! -f "settings/Testnet.toml" ]; then
    echo "📝 Creating Testnet.toml from template..."
    cat > settings/Testnet.toml << 'EOF'
[network]
name = "testnet"
node_rpc_address = "https://stacks-node-api.testnet.stacks.co"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "<TESTNET_MNEMONIC>"
EOF
fi

if [ ! -f "settings/Mainnet.toml" ]; then
    echo "📝 Creating Mainnet.toml from template..."
    cat > settings/Mainnet.toml << 'EOF'
[network]
name = "mainnet"
node_rpc_address = "https://stacks-node-api.mainnet.stacks.co"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "<MAINNET_MNEMONIC>"
EOF
fi

# Run initial checks
echo "🔍 Running contract checks..."
clarinet check

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit settings/Testnet.toml with your testnet mnemonic"
echo "2. Run tests: clarinet test"
echo "3. Deploy: ./deploy.sh testnet"
