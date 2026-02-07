# Stacks Content Monetization (Web3)

A decentralized platform for creators to monetize their content on the **Stacks blockchain**, leveraging Bitcoin's security and finality. This project enables various monetization models like token-gating (SIP-009/SIP-010), Clarity-based subscriptions, and one-time STX payments (Pay-Per-View) directly on **Stacks Mainnet**.

## 🚀 Features

- **Stacks Mainnet Ready**: All contracts are built with Clarity and optimized for Stacks, inheriting Bitcoin's security via Proof of Transfer (PoX).
- **Token Gating**: Restrict access to content based on SIP-009 (NFT) or SIP-010 (Token) ownership.
- **Micro-subscriptions**: Automated recurring payments using Clarity smart contracts.
- **Pay-Per-View**: Direct content access via one-time STX or SIP-010 token payments.
- **Decentralized Storage**: Content metadata hosted on Gaia or IPFS for censorship resistance.
- **Creator Dashboard**: Manage content, set pricing in STX, and track earnings.

## 🛠 Tech Stack

- **Smart Contracts**: Clarity (Stacks Blockchain)
- **Frontend**: Next.js, Tailwind CSS, Stacks.js (@stacks/connect, @stacks/transactions)
- **Backend**: Node.js, Express (API for content delivery/metadata)
- **Storage**: Gaia / IPFS
- **Wallet**: Hiro Wallet, Xverse Wallet, or any Stacks-compatible wallet

## 📁 Project Structure

```text
web3/
├── contracts/  # Clarity smart contracts
├── frontend/   # Next.js web application with Stacks.js
└── backend/    # API and metadata services
```

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Hiro Wallet](https://wallet.hiro.so/) or [Xverse Wallet](https://www.xverse.app/)
- [Clarinet](https://github.com/hirosystems/clarinet) (for Clarity development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/victor-olamide/victor-olamide-Web3-Content-Monetization.git
   cd victor-olamide-Web3-Content-Monetization
   ```

2. Install dependencies:
   ```bash
   # Frontend
   cd frontend && npm install

   # Backend
   cd ../backend && npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` in the `frontend` and `backend` directories. Ensure you have your Stacks Mainnet/Testnet RPC URLs.

## 🔧 Smart Contract Development

### Setup Clarinet Environment

```bash
# Run setup script
./setup-env.sh

# Or manually install Clarinet
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/
```

### Testing Contracts

```bash
# Run all tests
clarinet test

# Check contracts
clarinet check

# Start local devnet
clarinet integrate
```

### Deployment

```bash
# Deploy to testnet
./deploy.sh testnet

# Deploy to mainnet
./deploy.sh mainnet

# Verify deployment
./verify-deployment.sh testnet YOUR_ADDRESS
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🧪 Integration Testing

### Run Integration Tests on Testnet

```bash
cd integration-tests
npm install
cp .env.example .env
# Edit .env with your testnet keys
npm test
```

### Test Suites

- **Pay-Per-View**: Content purchase and access
- **Subscriptions**: Tier creation and user subscriptions
- **Token Gating**: FT/NFT access control
- **Backend API**: Access verification and delivery
- **End-to-End**: Complete user journey

For detailed testing instructions, see [integration-tests/README.md](integration-tests/README.md).

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
