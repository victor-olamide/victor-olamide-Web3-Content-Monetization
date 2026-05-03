# Integration Testing Guide

## Overview
Comprehensive end-to-end integration tests for the Stacks Content Monetization platform on Stacks Testnet.

## Test Coverage

### 1. Pay-Per-View Tests
- Creator adds content
- User verifies no access before purchase
- User purchases content
- User gains access after purchase
- Backend verifies access
- Content streaming works
- Duplicate purchase prevention

### 2. Subscription Tests
- Creator creates subscription tier
- User subscribes to tier
- Subscription verification
- Tier updates
- Backend subscription verification

### 3. Token Gating Tests
- FT gating rule creation
- NFT gating rule creation
- Access verification with tokens
- Rule deletion

### 4. Backend API Tests
- Health check
- Access verification endpoints
- Batch verification
- Content delivery
- Analytics endpoints

### 5. End-to-End Journey
- Complete creator workflow
- Complete user purchase workflow
- Multiple user scenarios
- Analytics tracking

## Prerequisites

1. **Node.js** v18+
2. **Testnet STX** - Get from [Stacks Testnet Faucet](https://explorer.stacks.co/sandbox/faucet?chain=testnet)
3. **Backend Service** running locally
4. **MongoDB** instance

## Setup

### 1. Install Dependencies
```bash
cd integration-tests
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your testnet credentials:
```env
BACKEND_API=http://localhost:5000/api
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
DEPLOYER_KEY=your_key
CREATOR_KEY=your_key
USER1_KEY=your_key
USER2_KEY=your_key
```

### 3. Start Backend
```bash
cd ../backend
npm start
```

### 4. Run Setup Script
```bash
./setup.sh
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
./run-tests.sh ppv           # Pay-per-view tests
./run-tests.sh subscription  # Subscription tests
./run-tests.sh gating        # Token gating tests
./run-tests.sh backend       # Backend API tests
./run-tests.sh e2e           # End-to-end journey
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Structure

```
integration-tests/
├── scenarios/              # Test scenarios
│   ├── pay-per-view.test.js
│   ├── subscription.test.js
│   ├── token-gating.test.js
│   ├── backend-api.test.js
│   └── e2e-journey.test.js
├── config.js              # Test configuration
├── helpers.js             # Test utilities
├── reporter.js            # Custom reporter
├── setup.js               # Jest setup
└── jest.config.js         # Jest configuration
```

## Test Accounts

The tests use 4 testnet accounts:
- **Deployer**: Contract deployment
- **Creator**: Content creator
- **User1**: First test user
- **User2**: Second test user

Each account needs testnet STX for transactions.

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Daily schedule (midnight UTC)
- Manual workflow dispatch

### GitHub Secrets Required
- `TESTNET_CONTRACT_ADDRESS`
- `TESTNET_DEPLOYER_KEY`
- `TESTNET_CREATOR_KEY`
- `TESTNET_USER1_KEY`
- `TESTNET_USER2_KEY`

## Test Reports

After running tests, a report is generated:
```
integration-tests/test-report.md
```

Coverage reports are in:
```
integration-tests/coverage/
```

## Troubleshooting

### Transaction Timeout
- Increase `TEST_TIMEOUT` in config.js
- Check Stacks testnet status

### Backend Connection Failed
- Ensure backend is running on port 5000
- Check `BACKEND_API` in .env

### Insufficient STX
- Get more testnet STX from faucet
- Wait for previous transactions to confirm

### Contract Not Found
- Verify `CONTRACT_ADDRESS` is correct
- Ensure contracts are deployed to testnet

## Best Practices

1. **Run tests sequentially** - Use `maxWorkers: 1` in Jest config
2. **Wait for confirmations** - Always wait for transaction confirmations
3. **Clean state** - Each test should be independent
4. **Handle failures gracefully** - Use try-catch for blockchain calls
5. **Monitor testnet** - Check Stacks Explorer for transaction status

## Monitoring

### Check Transaction Status
```bash
curl https://stacks-node-api.testnet.stacks.co/extended/v1/tx/TX_ID
```

### View Contract
```bash
curl https://stacks-node-api.testnet.stacks.co/v2/contracts/interface/ADDRESS/CONTRACT
```

### Backend Health
```bash
curl http://localhost:5000/api/status
```

## Contributing

When adding new tests:
1. Create test file in `scenarios/`
2. Use helpers from `helpers.js`
3. Follow existing test patterns
4. Update this documentation

## Support

For issues:
1. Check test logs
2. Verify testnet connectivity
3. Review transaction on Stacks Explorer
4. Open GitHub issue with details
