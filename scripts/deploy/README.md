# Stacks Contract Deployment Scripts

This directory contains scripts to deploy Clarity contracts to Stacks Mainnet or Testnet.

## Setup

1. Copy `.env.deploy.example` to `.env` in the root directory.
2. Fill in `DEPLOYER_PRIVATE_KEY` and set `STX_NETWORK` (mainnet or testnet).
3. Ensure you have the required dependencies installed:
   ```bash
   npm install @stacks/transactions @stacks/network dotenv
   ```

## Usage

### Deploy All Contracts
To deploy all contracts in the correct order:
```bash
node scripts/deploy/deploy-all.js
```

### Deploy Individual Contracts
```bash
node scripts/deploy/deploy-sip-010.js
node scripts/deploy/deploy-sip-009.js
node scripts/deploy/deploy-pay-per-view.js
# ... etc
```

### Check Transaction Status
```bash
node scripts/deploy/status-check.js <txid>
```

## Contracts included
- sip-010-trait
- sip-009-trait
- mock-token
- mock-nft
- pay-per-view
- subscription
- content-gate
