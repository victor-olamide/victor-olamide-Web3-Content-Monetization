# Tier Upgrade/Downgrade Flow - Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing tier upgrade and downgrade flows in the subscription system, including pro-rata pricing, benefit transitions, and data consistency.

## Upgrade/Downgrade Workflows

### Upgrade Flow

```
┌──────────────────┐
│  Current Tier    │
│  (e.g., Basic)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 1. User selects upgrade tier         │
│    (e.g., Standard)                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 2. System calculates pro-rata balance│
│    • Days remaining in billing cycle │
│    • Price difference                │
│    • Amount due                      │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 3. Display upgrade summary           │
│    • New tier benefits               │
│    • Cost to complete                │
│    • Effective date                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 4. Process payment (if amount due)   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 5. Update subscription               │
│    • New tier reference              │
│    • New benefits                    │
│    • Extend billing date             │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 6. Record upgrade in history         │
│    • Timestamp                       │
│    • From/To tier                    │
│    • Amount charged                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 7. Send confirmation                 │
│    • Email notification              │
│    • Updated subscription details    │
└──────────────────────────────────────┘
```

### Downgrade Flow

```
┌──────────────────┐
│  Current Tier    │
│ (e.g., Premium)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 1. User selects downgrade tier       │
│    (e.g., Standard)                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 2. Warn about feature loss           │
│    • Features no longer available    │
│    • Access level decrease           │
│    • Content restrictions            │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 3. Calculate pro-rata refund         │
│    • Days remaining in cycle         │
│    • Refund amount                   │
│    • Refund method                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 4. Display downgrade confirmation    │
│    • New benefits                    │
│    • Refund amount                   │
│    • Effective date                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 5. Confirm downgrade (require explicit)
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 6. Process refund (if applicable)    │
│    • Original payment method         │
│    • Process via payment provider    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 7. Update subscription               │
│    • New tier reference              │
│    • Remove restricted benefits      │
│    • Extend billing date             │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 8. Record downgrade in history       │
│    • Timestamp                       │
│    • From/To tier                    │
│    • Refund amount                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 9. Send confirmation                 │
│    • Email with receipt              │
│    • Updated subscription details    │
└──────────────────────────────────────┘
```

## Core Implementation

### 1. Service Layer Functions

**subscriptionService.js additions**:

```javascript
/**
 * Handle tier upgrade for active subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {string} newTierId - New tier ID
 * @returns {Object} Upgrade result
 */
async function upgradeSubscriptionTier(subscriptionId, newTierId) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Only active subscriptions can be upgraded');
    }

    const currentTier = await SubscriptionTier.findById(subscription.subscriptionTierId);
    const newTier = await SubscriptionTier.findById(newTierId);

    if (!newTier) {
      throw new Error('New tier not found');
    }

    // Check upgrade eligibility
    if (newTier.accessLevel <= currentTier.accessLevel) {
      throw new Error('Target tier must have higher access level than current');
    }

    // Calculate pro-rata amount
    const proration = calculateProRataUpgrade(
      subscription,
      currentTier,
      newTier
    );

    // Process payment if amount due
    if (proration.amountDue > 0) {
      const payment = await processPayment(subscription, proration.amountDue);
      proration.paymentId = payment.id;
      proration.transactionDate = payment.createdAt;
    }

    // Update subscription
    const oldTier = subscription.subscriptionTierId;
    subscription.subscriptionTierId = newTier._id;
    subscription.tierName = newTier.name;
    subscription.tierPrice = newTier.price;
    subscription.tierBenefits = newTier.benefits;
    subscription.nextBillingDate = calculateNextBillingDate(
      subscription.nextBillingDate,
      proration.remainingDays
    );
    
    await subscription.save();

    // Record upgrade event
    const upgradeRecord = {
      subscriptionId: subscription._id,
      fromTierId: oldTier,
      toTierId: newTier._id,
      fromTierName: currentTier.name,
      toTierName: newTier.name,
      timestamp: new Date(),
      amountCharged: proration.amountDue,
      prorationDays: proration.remainingDays,
      transactionId: proration.paymentId,
    };

    // Store in subscription history (implement as needed)
    // await SubscriptionHistory.create(upgradeRecord);

    // Update tier statistics
    await subscriptionTierService.recordTierPurchase(newTier._id, proration.amountDue);
    
    // Send confirmation email
    await sendUpgradeConfirmation(subscription, currentTier, newTier, proration);

    return {
      success: true,
      subscription: subscription.toObject(),
      upgradeDetails: upgradeRecord,
      proration,
    };
  } catch (error) {
    console.error('Upgrade failed:', error);
    throw error;
  }
}

/**
 * Handle tier downgrade for active subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {string} newTierId - New tier ID
 * @returns {Object} Downgrade result
 */
async function downgradeSubscriptionTier(subscriptionId, newTierId) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Only active subscriptions can be downgraded');
    }

    const currentTier = await SubscriptionTier.findById(subscription.subscriptionTierId);
    const newTier = await SubscriptionTier.findById(newTierId);

    if (!newTier) {
      throw new Error('New tier not found');
    }

    // Check downgrade eligibility
    if (newTier.accessLevel >= currentTier.accessLevel) {
      throw new Error('Target tier must have lower access level than current');
    }

    // Calculate pro-rata refund
    const proration = calculateProRataDowngrade(
      subscription,
      currentTier,
      newTier
    );

    // Process refund if applicable
    if (proration.refundAmount > 0) {
      const refund = await processRefund(subscription, proration.refundAmount);
      proration.refundId = refund.id;
      proration.refundDate = refund.createdAt;
    }

    // Update subscription
    const oldTier = subscription.subscriptionTierId;
    subscription.subscriptionTierId = newTier._id;
    subscription.tierName = newTier.name;
    subscription.tierPrice = newTier.price;
    subscription.tierBenefits = newTier.benefits;
    subscription.nextBillingDate = calculateNextBillingDate(
      subscription.nextBillingDate,
      proration.remainingDays
    );
    
    // Revoke restricted access
    await revokeRestrictedAccess(subscription, currentTier, newTier);
    
    await subscription.save();

    // Record downgrade event
    const downgradeRecord = {
      subscriptionId: subscription._id,
      fromTierId: oldTier,
      toTierId: newTier._id,
      fromTierName: currentTier.name,
      toTierName: newTier.name,
      timestamp: new Date(),
      refundAmount: proration.refundAmount,
      prorationDays: proration.remainingDays,
      refundId: proration.refundId,
    };

    // Store in subscription history
    // await SubscriptionHistory.create(downgradeRecord);

    // Update tier statistics
    await subscriptionTierService.recordTierCancellation(oldTier);
    
    // Send confirmation email with refund details
    await sendDowngradeConfirmation(subscription, currentTier, newTier, proration);

    return {
      success: true,
      subscription: subscription.toObject(),
      downgradeDetails: downgradeRecord,
      proration,
    };
  } catch (error) {
    console.error('Downgrade failed:', error);
    throw error;
  }
}

/**
 * Calculate pro-rata upgrade costs
 * @param {Object} subscription - Subscription document
 * @param {Object} currentTier - Current tier
 * @param {Object} newTier - New tier
 * @returns {Object} Proration details
 */
function calculateProRataUpgrade(subscription, currentTier, newTier) {
  const now = new Date();
  const billingCycleLength = subscription.billingCycle === 'yearly' ? 365 : 30;
  const elapsedDays = Math.floor(
    (now - subscription.currentBillingStart) / (1000 * 60 * 60 * 24)
  );
  const remainingDays = Math.max(0, billingCycleLength - elapsedDays);

  // Daily rates
  const currentDailyRate = currentTier.price / billingCycleLength;
  const newDailyRate = newTier.price / billingCycleLength;

  // Calculate costs
  const creditForRemainingTime = currentDailyRate * remainingDays;
  const costOfNewTierForRemainingTime = newDailyRate * remainingDays;
  const amountDue = Math.max(0, costOfNewTierForRemainingTime - creditForRemainingTime);

  return {
    billingCycleLength,
    elapsedDays,
    remainingDays,
    currentTierDailyRate: parseFloat(currentDailyRate.toFixed(4)),
    newTierDailyRate: parseFloat(newDailyRate.toFixed(4)),
    creditForRemainingTime: parseFloat(creditForRemainingTime.toFixed(2)),
    costOfNewTierForRemainingTime: parseFloat(costOfNewTierForRemainingTime.toFixed(2)),
    amountDue: parseFloat(amountDue.toFixed(2)),
    effectiveDate: now,
    nextBillingDate: subscription.nextBillingDate,
  };
}

/**
 * Calculate pro-rata downgrade refunds
 * @param {Object} subscription - Subscription document
 * @param {Object} currentTier - Current tier
 * @param {Object} newTier - New tier
 * @returns {Object} Proration details
 */
function calculateProRataDowngrade(subscription, currentTier, newTier) {
  const now = new Date();
  const billingCycleLength = subscription.billingCycle === 'yearly' ? 365 : 30;
  const elapsedDays = Math.floor(
    (now - subscription.currentBillingStart) / (1000 * 60 * 60 * 24)
  );
  const remainingDays = Math.max(0, billingCycleLength - elapsedDays);

  // Daily rates
  const currentDailyRate = currentTier.price / billingCycleLength;
  const newDailyRate = newTier.price / billingCycleLength;

  // Calculate refund
  const creditForRemainingTime = currentDailyRate * remainingDays;
  const costOfNewTierForRemainingTime = newDailyRate * remainingDays;
  const refundAmount = Math.max(0, creditForRemainingTime - costOfNewTierForRemainingTime);

  return {
    billingCycleLength,
    elapsedDays,
    remainingDays,
    currentTierDailyRate: parseFloat(currentDailyRate.toFixed(4)),
    newTierDailyRate: parseFloat(newDailyRate.toFixed(4)),
    creditForRemainingTime: parseFloat(creditForRemainingTime.toFixed(2)),
    costOfNewTierForRemainingTime: parseFloat(costOfNewTierForRemainingTime.toFixed(2)),
    refundAmount: parseFloat(refundAmount.toFixed(2)),
    effectiveDate: now,
    nextBillingDate: subscription.nextBillingDate,
  };
}

/**
 * Helper: Calculate next billing date
 */
function calculateNextBillingDate(currentBillingDate, remainingDays) {
  const date = new Date(currentBillingDate);
  date.setDate(date.getDate() + remainingDays);
  return date;
}

/**
 * Helper: Revoke restricted content access
 */
async function revokeRestrictedAccess(subscription, fromTier, toTier) {
  const restrictedFeatures = fromTier.benefits
    .filter(b => b.included && !toTier.benefits.find(tb => tb.feature === b.feature && tb.included))
    .map(b => b.feature);

  if (restrictedFeatures.length === 0) return;

  // Log access revocation for audit
  console.log(`Revoking access to: ${restrictedFeatures.join(', ')}`);
  
  // Implement content access control as needed
  // Could involve:
  // - Revoking premium content access
  // - Removing from exclusive creator groups
  // - Disabling advanced features
  // - etc.
}
```

### 2. API Routes

**subscriptionRoutes.js additions**:

```javascript
/**
 * POST /api/subscriptions/:subscriptionId/upgrade
 * Upgrade subscription to higher tier
 */
router.post('/:subscriptionId/upgrade', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newTierId } = req.body;

    if (!newTierId) {
      return res.status(400).json({ error: 'New tier ID is required' });
    }

    const result = await subscriptionService.upgradeSubscriptionTier(
      subscriptionId,
      newTierId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    return res.status(400).json({
      error: error.message,
      code: 'UPGRADE_FAILED',
    });
  }
});

/**
 * POST /api/subscriptions/:subscriptionId/downgrade
 * Downgrade subscription to lower tier
 */
router.post('/:subscriptionId/downgrade', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newTierId } = req.body;

    if (!newTierId) {
      return res.status(400).json({ error: 'New tier ID is required' });
    }

    const result = await subscriptionService.downgradeSubscriptionTier(
      subscriptionId,
      newTierId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Downgrade error:', error);
    return res.status(400).json({
      error: error.message,
      code: 'DOWNGRADE_FAILED',
    });
  }
});

/**
 * GET /api/subscriptions/:subscriptionId/upgrade-options
 * Get available upgrade tiers
 */
router.get('/:subscriptionId/upgrade-options', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const currentTier = await SubscriptionTier.findById(subscription.subscriptionTierId);
    const availableTiers = await SubscriptionTier.find({
      creatorId: currentTier.creatorId,
      isActive: true,
      accessLevel: { $gt: currentTier.accessLevel },
    }).sort({ accessLevel: 1 });

    const upgradeOptions = availableTiers.map(tier => {
      const proration = calculateProRataUpgrade(subscription, currentTier, tier);
      return {
        tierId: tier._id,
        tierName: tier.name,
        currentPrice: tier.price,
        amountDue: proration.amountDue,
        benefits: tier.benefits,
        accessLevel: tier.accessLevel,
      };
    });

    return res.status(200).json({
      currentTier: {
        tierId: currentTier._id,
        tierName: currentTier.name,
        price: currentTier.price,
        accessLevel: currentTier.accessLevel,
      },
      upgradeOptions,
    });
  } catch (error) {
    console.error('Upgrade options error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscriptions/:subscriptionId/downgrade-options
 * Get available downgrade tiers
 */
router.get('/:subscriptionId/downgrade-options', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const currentTier = await SubscriptionTier.findById(subscription.subscriptionTierId);
    const availableTiers = await SubscriptionTier.find({
      creatorId: currentTier.creatorId,
      isActive: true,
      accessLevel: { $lt: currentTier.accessLevel },
    }).sort({ accessLevel: -1 });

    const downgradeOptions = availableTiers.map(tier => {
      const proration = calculateProRataDowngrade(subscription, currentTier, tier);
      const lostFeatures = currentTier.benefits.filter(
        b => b.included && !tier.benefits.find(tb => tb.feature === b.feature && tb.included)
      );

      return {
        tierId: tier._id,
        tierName: tier.name,
        currentPrice: tier.price,
        refundAmount: proration.refundAmount,
        benefits: tier.benefits,
        accessLevel: tier.accessLevel,
        lostFeatures: lostFeatures.map(f => f.feature),
      };
    });

    return res.status(200).json({
      currentTier: {
        tierId: currentTier._id,
        tierName: currentTier.name,
        price: currentTier.price,
        accessLevel: currentTier.accessLevel,
      },
      downgradeOptions,
    });
  } catch (error) {
    console.error('Downgrade options error:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

### 3. Email Notifications

**Upgrade confirmation template**:
```handlebars
<h2>Your Tier Has Been Upgraded!</h2>

<p>Hi {{subscriberName}},</p>

<p>Your subscription has been successfully upgraded to {{newTierName}}!</p>

<h3>Upgrade Details</h3>
<ul>
  <li><strong>From:</strong> {{oldTierName}} ({{oldPrice}}/{{billingCycle}})</li>
  <li><strong>To:</strong> {{newTierName}} ({{newPrice}}/{{billingCycle}})</li>
  <li><strong>Pro-rata charge:</strong> {{amountDue}}</li>
  <li><strong>Effective:</strong> {{effectiveDate}}</li>
</ul>

<h3>Your New Benefits</h3>
<ul>
  {{#each newBenefits}}
  <li>{{this.feature}} ✓</li>
  {{/each}}
</ul>

<h3>Next Billing</h3>
<p>Your next billing date remains: {{nextBillingDate}}</p>

<p>Thank you for your support!</p>
```

**Downgrade confirmation template**:
```handlebars
<h2>Your Tier Has Been Changed</h2>

<p>Hi {{subscriberName}},</p>

<p>Your subscription has been successfully downgraded to {{newTierName}}.</p>

<h3>Downgrade Details</h3>
<ul>
  <li><strong>From:</strong> {{oldTierName}} ({{oldPrice}}/{{billingCycle}})</li>
  <li><strong>To:</strong> {{newTierName}} ({{newPrice}}/{{billingCycle}})</li>
  <li><strong>Refund amount:</strong> {{refundAmount}}</li>
  <li><strong>Refund method:</strong> {{refundMethod}}</li>
  <li><strong>Effective:</strong> {{effectiveDate}}</li>
</ul>

<h3>Your New Benefits</h3>
<ul>
  {{#each newBenefits}}
  <li>{{this.feature}} ✓</li>
  {{/each}}
</ul>

<h3>Features You're Losing Access To</h3>
<ul>
  {{#each lostFeatures}}
  <li>{{this}}</li>
  {{/each}}
</ul>

<p>If you have any questions, please contact us at support@example.com</p>

<p>Thank you for being part of our community!</p>
```

## Frontend Implementation

### Upgrade/Downgrade UI Component

```javascript
// React component example

function TierChangeModal({ subscription, currentTier, tiers, onConfirm, onCancel }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isUpgrade = selectedTier && selectedTier.accessLevel > currentTier.accessLevel;
  const isDowngrade = selectedTier && selectedTier.accessLevel < currentTier.accessLevel;

  const proration = isUpgrade
    ? calculateProRataUpgrade(subscription, currentTier, selectedTier)
    : calculateProRataDowngrade(subscription, currentTier, selectedTier);

  const handleConfirm = async () => {
    if (!selectedTier) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = isUpgrade ? 'upgrade' : 'downgrade';
      const response = await fetch(
        `/api/subscriptions/${subscription._id}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newTierId: selectedTier._id }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Change failed');
      }

      onConfirm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tier-change-modal">
      <h2>{isUpgrade ? 'Upgrade' : 'Downgrade'} Your Subscription</h2>

      {isDowngrade && (
        <div className="warning">
          <p>⚠️ You will lose access to these features:</p>
          <ul>
            {/* Lost features list */}
          </ul>
        </div>
      )}

      <div className="proration-summary">
        <h3>Proration Details</h3>
        <table>
          <tr>
            <td>Remaining days:</td>
            <td>{proration.remainingDays}</td>
          </tr>
          {isUpgrade ? (
            <tr>
              <td>Amount due:</td>
              <td>${proration.amountDue.toFixed(2)}</td>
            </tr>
          ) : (
            <tr>
              <td>Refund amount:</td>
              <td>${proration.refundAmount.toFixed(2)}</td>
            </tr>
          )}
        </table>
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selectedTier || loading}
        className={isUpgrade ? 'btn-upgrade' : 'btn-downgrade'}
      >
        {loading ? 'Processing...' : `Confirm ${isUpgrade ? 'Upgrade' : 'Downgrade'}`}
      </button>

      {error && <div className="error">{error}</div>}

      <button onClick={onCancel} className="btn-cancel">
        Cancel
      </button>
    </div>
  );
}
```

## Testing

### Unit Tests

```javascript
describe('Subscription Tier Changes', () => {
  describe('calculateProRataUpgrade', () => {
    it('should calculate correct upgrade cost', () => {
      const subscription = {
        subscriptionTierId: basicTier._id,
        currentBillingStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        billingCycle: 'monthly',
      };

      const proration = calculateProRataUpgrade(
        subscription,
        basicTier,
        standardTier
      );

      expect(proration.amountDue).toBeGreaterThan(0);
      expect(proration.remainingDays).toBeLessThanOrEqual(30);
    });
  });

  describe('upgradeSubscriptionTier', () => {
    it('should upgrade subscription successfully', async () => {
      const result = await subscriptionService.upgradeSubscriptionTier(
        subscription._id,
        standardTier._id
      );

      expect(result.success).toBe(true);
      expect(result.subscription.subscriptionTierId).toBe(standardTier._id);
      expect(result.upgradeDetails.fromTierName).toBe('Basic');
      expect(result.upgradeDetails.toTierName).toBe('Standard');
    });
  });
});
```

### Integration Tests

```javascript
describe('Upgrade/Downgrade API Endpoints', () => {
  describe('POST /subscriptions/:id/upgrade', () => {
    it('should return upgrade options', async () => {
      const res = await request
        .get(`/api/subscriptions/${subscription._id}/upgrade-options`)
        .expect(200);

      expect(res.body.upgradeOptions).toBeArray();
      expect(res.body.upgradeOptions.length).toBeGreaterThan(0);
      expect(res.body.upgradeOptions[0].amountDue).toBeDefined();
    });

    it('should complete upgrade with payment', async () => {
      const res = await request
        .post(`/api/subscriptions/${subscription._id}/upgrade`)
        .send({ newTierId: standardTier._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.subscriptionTierId).toBe(standardTier._id);
    });
  });
});
```

## Best Practices

✅ **Always calculate pro-rata pricing correctly**
- Account for exact days remaining
- Handle timezone differences
- Round to nearest cent

✅ **Require explicit confirmation for downgrades**
- Warn about lost features
- Show refund amount
- Require double-click or password

✅ **Maintain detailed history**
- Record all tier changes
- Track amounts and dates
- Enable audit trails

✅ **Notify both parties**
- Email subscriber confirmation
- Log for creator analytics
- Update account history

✅ **Handle edge cases**
- Tier might be deleted (preserve history)
- Payment processing failures
- Subscription already cancelled

✅ **Performance considerations**
- Cache tier information
- Batch proration calculations
- Async email sending

## Monitoring & Analytics

Track tier changes:
- Number of upgrades/downgrades per day
- Revenue impact by tier change type
- Average days before upgrade/downgrade
- Most common tier transitions
- Downgrade churn rate

---

**Upgrade/Downgrade Guide Version**: 1.0
**Last Updated**: 2024-01-15
