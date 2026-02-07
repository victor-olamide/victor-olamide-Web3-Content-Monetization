# Stacks Content Monetization Platform

> **Decentralized Content Monetization on Bitcoin via Stacks**

A production-ready platform for creators to monetize digital content on the **Stacks blockchain**, inheriting Bitcoin's security through Proof of Transfer (PoX). Built entirely with Clarity smart contracts and deployed on **Stacks Mainnet**.

[![Stacks](https://img.shields.io/badge/Stacks-Mainnet-5546FF?logo=stacks)](https://www.stacks.co/)
[![Clarity](https://img.shields.io/badge/Clarity-Smart%20Contracts-5546FF)](https://clarity-lang.org/)
[![Bitcoin](https://img.shields.io/badge/Secured%20by-Bitcoin-F7931A?logo=bitcoin)](https://bitcoin.org/)

## 🎯 Why Stacks?

This platform leverages **Stacks blockchain** to bring smart contracts to Bitcoin:

- **Bitcoin Security**: All transactions settle on Bitcoin through Proof of Transfer
- **Clarity Smart Contracts**: Decidable, secure smart contracts with no reentrancy attacks
- **STX Payments**: Native cryptocurrency payments with Bitcoin-level security
- **Stacks Mainnet**: Production-ready deployment on live blockchain
- **SIP Standards**: Full support for SIP-009 (NFTs) and SIP-010 (Fungible Tokens)

## 🚀 Features

### Stacks-Native Monetization

- **Pay-Per-View (PPV)**: One-time STX payments for instant content access
- **Subscriptions**: Recurring STX payments managed by Clarity contracts
- **Token Gating**: Content access based on SIP-009 NFT or SIP-010 token ownership
- **Creator Earnings**: Direct STX payments to creator wallets
- **On-Chain Verification**: All access rights verified on Stacks blockchain

### Built on Stacks

- **Clarity Contracts**: All business logic in auditable Clarity smart contracts
- **Stacks.js Integration**: Frontend powered by official Stacks JavaScript libraries
- **Wallet Support**: Compatible with Hiro Wallet, Xverse, and all Stacks wallets
- **Gaia Storage**: Decentralized content storage using Stacks' Gaia system
- **Bitcoin Finality**: Transactions inherit Bitcoin's security guarantees

## 🏗️ Architecture

### Stacks Smart Contracts (Clarity)

```clarity
;; Core contracts deployed on Stacks Mainnet
├── pay-per-view.clar      # STX-based content purchases
├── subscription.clar       # Recurring STX subscriptions
├── content-gate.clar       # SIP-009/SIP-010 token gating
├── sip-009-trait.clar      # NFT standard interface
└── sip-010-trait.clar      # Fungible token interface
```

### Technology Stack

- **Blockchain**: Stacks Mainnet (Bitcoin Layer 2)
- **Smart Contracts**: Clarity 2.0
- **Frontend**: Next.js 14 + Stacks.js + Tailwind CSS
- **Backend**: Node.js + Express (content delivery gateway)
- **Storage**: Gaia (Stacks) / IPFS
- **Wallets**: Hiro Wallet, Xverse, Leather

## 📁 Project Structure

```text
stacks-content-monetization/
├── contracts/              # Clarity smart contracts
│   ├── pay-per-view.clar
│   ├── subscription.clar
│   ├── content-gate.clar
│   └── traits/
├── frontend/              # Next.js + Stacks.js
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
├── backend/               # Content delivery API
│   ├── services/
│   ├── routes/
│   └── middleware/
├── tests/                 # Clarinet tests
├── integration-tests/     # E2E tests on testnet
└── deployments/          # Deployment configs
```

## 💻 Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Clarinet** ([Install Guide](https://docs.hiro.so/clarinet))
- **Stacks Wallet** ([Hiro Wallet](https://wallet.hiro.so/) or [Xverse](https://www.xverse.app/))
- **Testnet STX** ([Faucet](https://explorer.stacks.co/sandbox/faucet?chain=testnet))

### Installation

```bash
# Clone repository
git clone https://github.com/victor-olamide/stacks-content-monetization.git
cd stacks-content-monetization

# Install Clarinet (if not installed)
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/

# Setup environment
./setup-env.sh

# Install dependencies
cd frontend && npm install
cd ../backend && npm install
```

### Configure Stacks Network

```bash
# Frontend (.env)
cp frontend/.env.example frontend/.env
```

```env
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_STACKS_API=https://stacks-node-api.mainnet.stacks.co
NEXT_PUBLIC_CONTRACT_ADDRESS=SP000000000000000000002Q6VF78
```

```bash
# Backend (.env)
cp backend/.env.example backend/.env
```

```env
STACKS_NETWORK=mainnet
STACKS_API_URL=https://stacks-node-api.mainnet.stacks.co
CONTRACT_ADDRESS=SP000000000000000000002Q6VF78
```

### Run Development Environment

```bash
# Terminal 1: Start Clarinet devnet
clarinet integrate

# Terminal 2: Start backend
cd backend && npm run dev

# Terminal 3: Start frontend
cd frontend && npm run dev
```

Access the app at `http://localhost:3000`

## 🔧 Clarity Smart Contract Development

### Test Contracts Locally

```bash
# Check contract syntax
clarinet check

# Run all Clarity tests
clarinet test

# Run specific test
clarinet test tests/pay-per-view_test.ts

# Start local Stacks devnet
clarinet integrate
```

### Deploy to Stacks Testnet

```bash
# Configure testnet credentials
cp settings/Testnet.toml.example settings/Testnet.toml
# Edit with your testnet mnemonic

# Deploy all contracts
./deploy.sh testnet

# Verify deployment
./verify-deployment.sh testnet YOUR_STACKS_ADDRESS
```

### Deploy to Stacks Mainnet

```bash
# Configure mainnet credentials (SECURE THIS FILE!)
cp settings/Mainnet.toml.example settings/Mainnet.toml
# Edit with your mainnet mnemonic

# Deploy to production
./deploy.sh mainnet

# Verify on Stacks Explorer
https://explorer.stacks.co/txid/YOUR_TX_ID?chain=mainnet
```

### Contract Addresses (Mainnet)

After deployment, update these addresses:

```clarity
;; Pay-Per-View Contract
SP000000000000000000002Q6VF78.pay-per-view

;; Subscription Contract  
SP000000000000000000002Q6VF78.subscription

;; Content Gate Contract
SP000000000000000000002Q6VF78.content-gate
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🧪 Integration Testing on Stacks Testnet

### Setup Test Environment

```bash
cd integration-tests
npm install
cp .env.example .env
```

Edit `.env` with your Stacks testnet credentials:

```env
BACKEND_API=http://localhost:5000/api
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
DEPLOYER_KEY=your_testnet_private_key
CREATOR_KEY=your_testnet_private_key
USER1_KEY=your_testnet_private_key
USER2_KEY=your_testnet_private_key
```

### Run Tests on Stacks Testnet

```bash
# Run all integration tests
npm test

# Run specific test suite
./run-tests.sh ppv           # Pay-per-view
./run-tests.sh subscription  # Subscriptions
./run-tests.sh gating        # Token gating
./run-tests.sh backend       # Backend API
./run-tests.sh e2e           # End-to-end
```

### Test Coverage

- **Pay-Per-View**: STX payment flow and content access
- **Subscriptions**: Tier creation and recurring payments
- **Token Gating**: SIP-009/SIP-010 access control
- **Backend API**: Content delivery and verification
- **End-to-End**: Complete user journey on Stacks

See [integration-tests/README.md](integration-tests/README.md) for details.

## 🔗 Stacks Resources

### Official Documentation
- [Stacks Blockchain](https://docs.stacks.co/)
- [Clarity Language](https://docs.stacks.co/clarity/)
- [Stacks.js](https://stacks.js.org/)
- [Clarinet](https://docs.hiro.so/clarinet/)

### Explorers
- [Stacks Explorer (Mainnet)](https://explorer.stacks.co/?chain=mainnet)
- [Stacks Explorer (Testnet)](https://explorer.stacks.co/?chain=testnet)

### Wallets
- [Hiro Wallet](https://wallet.hiro.so/)
- [Xverse Wallet](https://www.xverse.app/)
- [Leather Wallet](https://leather.io/)

### Community
- [Stacks Discord](https://discord.gg/stacks)
- [Stacks Forum](https://forum.stacks.org/)
- [Stacks GitHub](https://github.com/stacks-network)

## 📊 Stacks Mainnet Deployment

### Pre-Deployment Checklist

- [ ] All Clarinet tests passing
- [ ] Security audit completed
- [ ] Testnet deployment successful
- [ ] Frontend tested with testnet contracts
- [ ] Mainnet STX funded for deployment
- [ ] Contract addresses documented
- [ ] Monitoring setup ready

### Mainnet Contract Deployment

```bash
# Final checks
clarinet check
clarinet test

# Deploy to Stacks Mainnet
./deploy.sh mainnet

# Monitor deployment
https://explorer.stacks.co/txid/YOUR_TX_ID?chain=mainnet
```

### Post-Deployment

1. Update frontend with mainnet contract addresses
2. Update backend configuration
3. Verify all contracts on Stacks Explorer
4. Test basic functionality on mainnet
5. Announce launch to community

## 🛡️ Security

### Clarity Contract Security

- **No Reentrancy**: Clarity prevents reentrancy attacks by design
- **Decidable**: All contract execution is predictable
- **Post-Conditions**: Transaction safety guarantees
- **Read-Only Functions**: Clear separation of state changes

### Audit Status

- [ ] Internal security review
- [ ] External audit (recommended for mainnet)
- [ ] Bug bounty program

## 🤝 Contributing

We welcome contributions to improve the Stacks Content Monetization platform!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow Clarity best practices
- Write tests for all new features
- Update documentation
- Test on Stacks testnet before mainnet

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

- **Project**: [GitHub Repository](https://github.com/victor-olamide/stacks-content-monetization)
- **Stacks**: [Stacks Blockchain](https://www.stacks.co/)
- **Issues**: [GitHub Issues](https://github.com/victor-olamide/stacks-content-monetization/issues)

---

**Built on Stacks | Secured by Bitcoin**
