# Subscription Auto-Renewal System

## Overview

The subscription auto-renewal system automatically processes subscription renewals on a daily basis, handling on-chain payments, email notifications, and failure recovery.

## Features

- **Daily Processing**: Runs automatically every 24 hours (configurable)
- **On-Chain Payments**: Integrates with Stacks blockchain for secure payments
- **Email Notifications**: Sends confirmation emails to subscribers
- **Grace Period Management**: Applies grace periods to expired subscriptions
- **Failure Handling**: Robust error handling with retry mechanisms
- **Comprehensive Logging**: Detailed logging for monitoring and debugging

## Configuration

### Environment Variables

```bash
# Renewal Scheduler Configuration
RENEWAL_SCHEDULER_INTERVAL_MS=86400000  # 24 hours in milliseconds
RENEWAL_MAX_CONCURRENT_PROCESSES=5      # Max concurrent renewals
RENEWAL_GRACE_PERIOD_DAYS=3             # Grace period threshold
RENEWAL_MAX_RETRY_ATTEMPTS=3            # Max retry attempts
```

### Constants

The system uses the following configuration constants:

- **RENEWAL_PERIOD_DAYS**: 30 days (standard renewal period)
- **GRACE_PERIOD_THRESHOLD_DAYS**: 3 days (when to trigger renewal)
- **DEFAULT_PLATFORM_FEE_PERCENTAGE**: 2.5% (platform fee)

## Architecture

### Components

1. **renewalService.js**: Core renewal logic and validation
2. **renewalScheduler.js**: Scheduling and execution management
3. **server.js**: Integration and lifecycle management

### Process Flow

1. **Eligibility Check**: Validate subscription status and renewal requirements
2. **Payment Processing**: Execute on-chain payment via contract service
3. **Record Creation**: Create renewal record in database
4. **Subscription Update**: Update subscription expiry and status
5. **Email Notification**: Send confirmation email to subscriber
6. **Error Handling**: Log failures and schedule retries if needed

## API Endpoints

### Manual Renewal
```
POST /subscriptions/:id/renew
```

### Renewal History
```
GET /subscriptions/:id/renewals
```

### Complete Renewal
```
POST /subscriptions/renewal/:renewalId/complete
```

### Fail Renewal
```
POST /subscriptions/renewal/:renewalId/fail
```

## Monitoring

The system provides comprehensive logging for:

- Successful renewals
- Failed renewals with error details
- Email notification status
- Scheduler health and performance

## Error Handling

- **Payment Failures**: Logged and can be retried manually
- **Email Failures**: Non-blocking, logged as warnings
- **Database Errors**: Cause renewal failure with detailed logging
- **Network Issues**: Automatic retry with exponential backoff

## Security

- Validates subscription ownership before processing
- Secure on-chain transaction handling
- Input validation for all renewal parameters
- Rate limiting on manual renewal endpoints