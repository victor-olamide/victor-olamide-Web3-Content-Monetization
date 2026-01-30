# Blockchain - Base Smart Contracts

This directory contains the Solidity smart contracts for the Base Content Monetization platform.

## Contracts
- `BaseContentMonetization.sol`: Core contract for Pay-Per-View.
- `ContentGating.sol`: ERC-20 and ERC-721 based access control.
- `Subscription.sol`: Recurring payment management.

## Setup
1. Copy `.env.example` to `.env` and fill in your details.
2. Run `npm install`.
3. Compile with `npx hardhat compile`.
4. Deploy with `npx hardhat run scripts/deploy.ts --network base-mainnet`.
