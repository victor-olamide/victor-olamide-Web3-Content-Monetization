# Clarinet Deployment Guide

## Overview
This guide covers automated testing and deployment of Stacks smart contracts using Clarinet.

## Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) v1.0.0+
- Node.js v18+
- Git

## Installation

### Install Clarinet

**macOS/Linux:**
```bash
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/
```

**Windows:**
```powershell
winget install clarinet
```

## Project Structure

```
.
├── Clarinet.toml              # Main configuration
├── contracts/                 # Clarity smart contracts
├── tests/                     # Contract tests
├── settings/                  # Network configurations
│   ├── Devnet.toml
│   ├── Testnet.toml
│   └── Mainnet.toml
├── deployments/               # Deployment plans
│   ├── testnet.plan.yaml
│   └── mainnet.plan.yaml
└── .github/workflows/         # CI/CD pipelines
```

## Local Development

### Run Tests
```bash
clarinet test
```

### Check Contracts
```bash
clarinet check
```

### Start Local Devnet
```bash
clarinet integrate
```

### Interactive Console
```bash
clarinet console
```

## Deployment

### Testnet Deployment

1. **Configure credentials:**
   Edit `settings/Testnet.toml` and add your mnemonic:
   ```toml
   [accounts.deployer]
   mnemonic = "your testnet mnemonic here"
   ```

2. **Run deployment:**
   ```bash
   ./deploy.sh testnet
   ```

3. **Verify deployment:**
   ```bash
   ./verify-deployment.sh testnet YOUR_DEPLOYER_ADDRESS
   ```

### Mainnet Deployment

1. **Configure credentials:**
   Edit `settings/Mainnet.toml` and add your mnemonic:
   ```toml
   [accounts.deployer]
   mnemonic = "your mainnet mnemonic here"
   ```

2. **Run deployment:**
   ```bash
   ./deploy.sh mainnet
   ```

3. **Verify deployment:**
   ```bash
   ./verify-deployment.sh mainnet YOUR_DEPLOYER_ADDRESS
   ```

## CI/CD Automation

### GitHub Actions

The project includes two workflows:

1. **Clarinet Tests** (`clarinet-test.yml`)
   - Runs on every push/PR
   - Executes contract checks and tests
   - Generates coverage reports

2. **Deployment** (`deploy.yml`)
   - Manual trigger via GitHub UI
   - Deploys to testnet or mainnet
   - Requires `DEPLOYER_MNEMONIC` secret

### Setup GitHub Secrets

1. Go to repository Settings → Secrets
2. Add `DEPLOYER_MNEMONIC` with your deployment wallet mnemonic

### Trigger Deployment

1. Go to Actions tab
2. Select "Deploy to Testnet" workflow
3. Click "Run workflow"
4. Choose network (testnet/mainnet)
5. Click "Run workflow"

## Contract Deployment Order

Contracts are deployed in batches to handle dependencies:

**Batch 0:** Traits
- `sip-009-trait`
- `sip-010-trait`

**Batch 1:** Core Contracts
- `mock-nft` (testnet only)
- `mock-token` (testnet only)
- `pay-per-view`
- `subscription`

**Batch 2:** Dependent Contracts
- `content-gate`

## Testing

### Unit Tests

Each contract has comprehensive tests in the `tests/` directory:

- `pay-per-view_test.ts` - PPV functionality
- `subscription_test.ts` - Subscription tiers
- `content-gate_test.ts` - Token gating

### Run Specific Test
```bash
clarinet test tests/pay-per-view_test.ts
```

### Coverage Report
```bash
clarinet test --coverage
```

## Troubleshooting

### Contract Check Fails
- Ensure all dependencies are properly defined in `Clarinet.toml`
- Check contract syntax with `clarinet check`

### Deployment Fails
- Verify network configuration in `settings/`
- Ensure deployer has sufficient STX balance
- Check deployment plan syntax

### Tests Fail
- Run `clarinet console` to debug interactively
- Check test assertions and expected values

## Best Practices

1. **Always test before deploying**
   ```bash
   clarinet test && clarinet check
   ```

2. **Use testnet first**
   - Deploy to testnet before mainnet
   - Verify all functionality works

3. **Version control**
   - Commit deployment plans
   - Tag releases for mainnet deployments

4. **Security**
   - Never commit mnemonics
   - Use environment variables or secrets
   - Keep settings files in `.gitignore`

## Resources

- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [Stacks Blockchain](https://www.stacks.co/)
