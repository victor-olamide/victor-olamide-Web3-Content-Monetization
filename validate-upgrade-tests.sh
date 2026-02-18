#!/bin/bash

# Contract Upgrade Testing Validation Script
# This script validates the upgrade testing suite setup

echo "🔍 Contract Upgrade Testing Suite Validation"
echo "==========================================="

# Check directory structure
echo "📁 Checking directory structure..."

if [ -d "solidity-contracts" ]; then
    echo "✅ Solidity contracts directory found"
    if [ -f "solidity-contracts/test/upgrade.test.js" ]; then
        echo "✅ Solidity upgrade tests found"
    else
        echo "❌ Solidity upgrade tests missing"
    fi
else
    echo "❌ Solidity contracts directory missing"
fi

if [ -d "contracts" ]; then
    echo "✅ Clarity contracts directory found"
    if [ -f "contracts/test/upgrade.test.js" ]; then
        echo "✅ Clarity upgrade tests found"
    else
        echo "❌ Clarity upgrade tests missing"
    fi
    if [ -f "contracts/test/integration-upgrade.test.js" ]; then
        echo "✅ Integration tests found"
    else
        echo "❌ Integration tests missing"
    fi
else
    echo "❌ Clarity contracts directory missing"
fi

# Check contract files
echo ""
echo "📄 Checking contract files..."

contracts=(
    "solidity-contracts/ContentManagerV1.sol"
    "solidity-contracts/ContentManagerV2.sol"
    "solidity-contracts/ContentManagerProxy.sol"
    "contracts/content-gate.clar"
    "contracts/content-gate-v2.clar"
)

for contract in "${contracts[@]}"; do
    if [ -f "$contract" ]; then
        echo "✅ $contract found"
    else
        echo "❌ $contract missing"
    fi
done

# Check Node.js environment
echo ""
echo "🔧 Checking development environment..."

if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found"
fi

if command -v npm &> /dev/null; then
    echo "✅ npm found: $(npm --version)"
else
    echo "❌ npm not found"
fi

if command -v npx &> /dev/null; then
    echo "✅ npx found"
else
    echo "❌ npx not found"
fi

# Check Hardhat
if command -v npx &> /dev/null && [ -f "solidity-contracts/hardhat.config.ts" ]; then
    if npx hardhat --version &> /dev/null; then
        echo "✅ Hardhat found"
    else
        echo "❌ Hardhat not configured"
    fi
else
    echo "⚠️  Hardhat check skipped (missing dependencies)"
fi

# Check Clarity CLI
if command -v clarity-cli &> /dev/null; then
    echo "✅ Clarity CLI found"
else
    echo "❌ Clarity CLI not found"
fi

echo ""
echo "📋 Validation Summary"
echo "===================="

# Count files
solidity_tests=$(find solidity-contracts/test -name "*.test.js" 2>/dev/null | wc -l)
clarity_tests=$(find contracts/test -name "*.test.js" 2>/dev/null | wc -l)
contracts_count=$(find solidity-contracts contracts -name "*.sol" -o -name "*.clar" 2>/dev/null | wc -l)

echo "Solidity test files: $solidity_tests"
echo "Clarity test files: $clarity_tests"
echo "Contract files: $contracts_count"

echo ""
echo "🚀 Next Steps"
echo "============="

if ! command -v node &> /dev/null; then
    echo "1. Install Node.js: https://nodejs.org/"
fi

if ! command -v npm &> /dev/null; then
    echo "2. Install npm (comes with Node.js)"
fi

if [ -f "solidity-contracts/package.json" ]; then
    echo "3. Install Solidity dependencies: cd solidity-contracts && npm install"
    echo "4. Run Solidity tests: cd solidity-contracts && npx hardhat test"
else
    echo "3. Create package.json in solidity-contracts/"
fi

if [ -f "contracts/package.json" ]; then
    echo "5. Install Clarity test dependencies: cd contracts && npm install"
    echo "6. Run Clarity tests: cd contracts && npm test"
else
    echo "5. Create package.json in contracts/"
fi

echo "7. Run integration tests: cd contracts && npm run test:integration"

echo ""
echo "✨ Validation complete!"