# Platform Fee Collection

## Overview

The pay-per-view contract now supports configurable platform fee collection on all content purchases. This allows the platform to collect a percentage of each transaction while the creator receives the remaining amount.

## Features

- **Configurable Fee**: Platform fee is set in basis points (1 basis point = 0.01%)
- **Default Fee**: 2.5% (250 basis points)
- **Maximum Fee**: 10% (1000 basis points)
- **Automatic Split**: Payments are automatically split between platform wallet and creator
- **Transparent Calculation**: Fee calculation functions are publicly available

## Smart Contract Functions

### Admin Functions

#### set-platform-fee
```clarity
(define-public (set-platform-fee (new-fee uint)))
```
Updates the platform fee percentage. Only callable by contract owner.
- **Parameter**: `new-fee` - Fee in basis points (max 1000)
- **Returns**: `(ok true)` on success

#### set-platform-wallet
```clarity
(define-public (set-platform-wallet (new-wallet principal)))
```
Updates the wallet address that receives platform fees. Only callable by contract owner.
- **Parameter**: `new-wallet` - Principal address of platform wallet
- **Returns**: `(ok true)` on success

### Read-Only Functions

#### calculate-platform-fee
```clarity
(define-read-only (calculate-platform-fee (amount uint)))
```
Calculates the platform fee for a given amount.
- **Parameter**: `amount` - Total purchase amount
- **Returns**: Platform fee amount

#### calculate-creator-amount
```clarity
(define-read-only (calculate-creator-amount (amount uint)))
```
Calculates the creator's net amount after platform fee deduction.
- **Parameter**: `amount` - Total purchase amount
- **Returns**: Creator's net amount

#### get-platform-fee
```clarity
(define-read-only (get-platform-fee))
```
Returns the current platform fee in basis points.

#### get-platform-wallet
```clarity
(define-read-only (get-platform-wallet))
```
Returns the current platform wallet address.

## Payment Flow

When a user purchases content:

1. Total price is retrieved from content pricing
2. Platform fee is calculated: `(price * platform-fee) / 10000`
3. Creator amount is calculated: `price - platform-fee`
4. Platform fee is transferred to platform wallet
5. Creator amount is transferred to creator
6. Access is granted to user

## Configuration

### Initial Setup

After deploying the contract, configure the platform wallet:

```bash
clarinet console
(contract-call? .pay-per-view set-platform-wallet 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

### Update Platform Fee

```bash
clarinet console
(contract-call? .pay-per-view set-platform-fee u500)
```

## API Endpoints

### GET /api/purchases/platform-fee
Returns current platform fee information.

**Response:**
```json
{
  "platformFee": 250,
  "feePercentage": "2.50%"
}
```

### GET /api/purchases/calculate-fee/:amount
Calculates fee breakdown for a specific amount.

**Response:**
```json
{
  "totalAmount": 1000000,
  "platformFee": 25000,
  "creatorAmount": 975000
}
```

## Examples

### Example 1: Default Fee (2.5%)
- Content Price: 1,000,000 microSTX (1 STX)
- Platform Fee: 25,000 microSTX (0.025 STX)
- Creator Receives: 975,000 microSTX (0.975 STX)

### Example 2: Custom Fee (5%)
- Content Price: 5,000,000 microSTX (5 STX)
- Platform Fee: 250,000 microSTX (0.25 STX)
- Creator Receives: 4,750,000 microSTX (4.75 STX)

## Testing

Run the test suite to verify platform fee functionality:

```bash
clarinet test tests/pay-per-view_test.ts
```

## Security Considerations

1. **Owner-Only Access**: Only contract owner can modify fee and wallet
2. **Fee Cap**: Maximum fee is capped at 10% to protect creators
3. **Transparent Calculation**: All fee calculations are public and verifiable
4. **Atomic Transfers**: Both platform and creator payments happen in same transaction
