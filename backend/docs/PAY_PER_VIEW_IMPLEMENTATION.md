# Pay-Per-View Purchase API Implementation - Issue #151

## Overview

This document describes the implementation of the Pay-Per-View purchase API for content creators. It allows users to buy access to individual content on the platform using Stacks (STX) tokens.

## Features Implemented

### 1. POST /purchases - Create Purchase
- Endpoint: `POST /purchases/purchases`
- Description: Buy access to individual content
- Required Fields:
  - `contentId` (number): ID of the content
  - `user` (string): Stacks wallet address of the buyer
  - `creator` (string): Stacks wallet address of the content creator
  - `txId` (string): Stacks blockchain transaction ID
  - `amount` (number): Purchase amount in STX

**Response:**
```json
{
  "purchase": {
    "_id": "...",
    "contentId": 1,
    "user": "SP...",
    "creator": "SP...",
    "txId": "0x...",
    "amount": 1000,
    "platformFee": 100,
    "creatorAmount": 900,
    "timestamp": "2024-04-15T10:00:00Z"
  },
  "verification": {
    "txId": "0x...",
    "status": "success",
    "blockHeight": 12345,
    "confirmations": 10
  }
}
```

### 2. Blockchain Verification
- Service: `stacksApiService.js`
- Verifies transactions on Stacks blockchain
- Supports transaction confirmation tracking
- Retry logic for network resilience

### 3. Payment Processing
- Service: `purchasePaymentService.js`
- Calculates platform fees using smart contract
- Records transactions in history
- Validates payment eligibility
- Handles payment disputes

### 4. Access Management
- Service: `purchaseAccessService.js`
- Grants access after payment
- Revokes access when needed
- Manages access transfers (admin)
- Tracks access statistics

### 5. Access Control Routes
- `GET /access/:contentId/:userAddress` - Check access status
- `GET /access/accessible/:userAddress` - Get all accessible content
- `GET /access/info/:contentId/:userAddress` - Get access details
- `GET /access/stats/:contentId` - Get purchase statistics
- `POST /access/grant-access` - Grant access (admin)
- `POST /access/revoke-access` - Revoke access (admin)
- `POST /access/transfer-access` - Transfer access (admin)

### 6. Purchase History Tracking
- Service: `purchaseHistoryService.js`
- Records all purchases in transaction history
- Provides purchase analytics
- Generates creator revenue reports
- Tracks purchase trends

### 7. Error Handling
- Service: `purchaseErrorService.js`
- Handles payment verification failures
- Manages failed transactions
- Retry mechanisms for failed purchases
- Duplicate transaction detection
- Audit trail generation

### 8. Input Validation
- Middleware: `purchaseValidation.js`
- Validates purchase requests
- Validates Stacks addresses
- Validates amounts and transaction IDs
- Supports pagination parameters

## Services and Components

### Core Services
1. **stacksApiService.js**
   - Transaction verification
   - Confirmation tracking
   - Blockchain status checking

2. **purchaseAccessService.js**
   - Access granting/revoking
   - Access transfer
   - Statistics calculation

3. **purchaseHistoryService.js**
   - Purchase recording
   - Transaction tracking
   - Analytics reporting
   - Revenue calculations

4. **purchasePaymentService.js**
   - Payment processing
   - Fee calculations
   - Dispute handling
   - Payment analytics

5. **purchaseErrorService.js**
   - Error handling
   - Recovery mechanisms
   - Audit trail

### Routes
1. **purchaseRoutes.js** (Updated)
   - Added `POST /purchases` endpoint
   - Payment verification
   - Access granting

2. **purchaseAccessRoutes.js** (New)
   - Access management endpoints
   - Statistics endpoints
   - Admin operations

### Middleware
- **purchaseValidation.js** - Request validation

## Database Models

### Purchase Model
Existing model with new fields:
- `accessRevoked` (boolean)
- `accessRevokedAt` (date)
- `accessGranted` (boolean)
- `accessGrantedAt` (date)

### TransactionHistory Model
Records all purchase transactions:
- Transaction type: 'purchase'
- Amount and USD value
- Block details
- Related addresses
- Metadata

## API Workflow

### 1. Purchase Flow
```
User → POST /purchases → Verify Payment → Record Purchase → Grant Access → Return Response
```

### 2. Access Check Flow
```
User → GET /access/:contentId/:userAddress → Check Purchase → Return Access Status
```

### 3. Purchase Stats Flow
```
Admin → GET /stats/:contentId → Calculate Stats → Return Analytics
```

## Testing

Comprehensive test suites included:
- `purchaseApi.test.js` - API endpoint tests
- `purchaseAccessService.test.js` - Access management tests
- `stacksApiService.test.js` - Blockchain verification tests
- `purchasePaymentService.test.js` - Payment processing tests

## Configuration

Required environment variables:
- `STACKS_NETWORK` - 'mainnet' or 'testnet'
- `STACKS_API_URL` - Stacks API endpoint
- `CONTRACT_ADDRESS` - Smart contract address

## Error Handling

System handles:
- Invalid transaction IDs
- Duplicate purchases
- Payment verification failures
- Insufficient balance
- Content not found
- Access revocation conflicts
- Network timeouts

## Security Features

- Address validation (Stacks format)
- Amount validation (positive numbers)
- Transaction ID verification
- Duplicate transaction prevention
- Access revocation controls
- Audit trail logging
- Admin-only operations

## Future Enhancements

1. Subscription integration
2. Bulk purchase operations
3. Refund automation
4. Revenue sharing
5. Advanced analytics
6. Webhook notifications
7. Rate limiting
8. CSV export functionality
