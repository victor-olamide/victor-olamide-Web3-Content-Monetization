# Base Content Monetization (Web3)

A decentralized platform for creators to monetize their content on the **Base blockchain**, leveraging Ethereum's security and Layer 2 scalability. This project enables various monetization models like token-gating, ERC-20 based subscriptions, and one-time ETH payments (Pay-Per-View) directly on **Base Mainnet**.

## 🚀 Features

- **Base Mainnet Ready**: All contracts are built with Solidity and optimized for Base, inheriting Ethereum's security with ultra-low fees.
- **Token Gating**: Restrict access to content based on ERC-721 (NFT) or ERC-20 (Token) ownership.
- **Micro-subscriptions**: Automated recurring payments using EVM smart contracts.
- **Pay-Per-View**: Direct content access via one-time ETH or ERC-20 token payments.
- **Decentralized Storage**: Content metadata hosted on IPFS or Arweave for censorship resistance.
- **Creator Dashboard**: Manage content, set pricing in ETH/USDC, and track earnings.

## 🛠 Tech Stack

- **Smart Contracts**: Solidity (Base Blockchain)
- **Frontend**: Next.js, Tailwind CSS, Wagmi, Viem, AppKit
- **Backend**: Node.js, Express (API for content delivery/metadata)
- **Storage**: IPFS
- **Wallet**: Coinbase Wallet, MetaMask, or any EVM-compatible wallet

## 📁 Project Structure

```text
web3/
├── contracts/  # Solidity smart contracts
├── frontend/   # Next.js web application with Wagmi/Viem
└── backend/    # API and metadata services
```

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Coinbase Wallet](https://www.coinbase.com/wallet) or [MetaMask](https://metamask.io/)
- [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/) (for Solidity development)

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
   Copy `.env.example` to `.env` in the `frontend` and `backend` directories. Ensure you have your Base Mainnet RPC URL and deployment private keys.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
