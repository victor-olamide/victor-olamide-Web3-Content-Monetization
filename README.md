# Stacks Content Monetization (Web3)

A decentralized platform for creators to monetize their content on the **Stacks blockchain**, leveraging Bitcoin's security. This project enables various monetization models like token-gating, SIP-010 based subscriptions, and one-time STX payments (Pay-Per-View) directly on **Stacks Mainnet**.

## 🚀 Features

- **Bitcoin-Secured**: All contracts are built with Clarity and deployed on Stacks, inheriting Bitcoin's finality.
- **Token Gating**: Restrict access to content based on SIP-009 (NFT) or SIP-010 (FT) ownership.
- **Micro-subscriptions**: Automated recurring payments using Stacks smart contracts.
- **Pay-Per-View**: Direct content access via one-time STX or SIP-010 token payments.
- **Decentralized Storage**: Content metadata hosted on Gaia or IPFS for censorship resistance.
- **Creator Dashboard**: Manage content, set pricing in STX, and track earnings.

## 🛠 Tech Stack

- **Smart Contracts**: Clarity (Stacks Blockchain)
- **Frontend**: Next.js, Tailwind CSS, Stacks.js (Connect, Transactions)
- **Backend**: Node.js, Express (API for content delivery/metadata)
- **Storage**: Gaia (Stacks) or IPFS
- **Wallet**: Leather or Xverse

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
- [Leather Wallet](https://leather.io/) or [Xverse](https://www.xverse.app/)
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
   Copy `.env.example` to `.env` in the `frontend` and `backend` directories.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
