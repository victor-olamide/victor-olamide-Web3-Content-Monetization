const Subscription = require('../models/Subscription');
const SubscriptionTier = require('../models/SubscriptionTier');
const { calculateRenewalStatus } = require('./renewalService');

/**
 * Build an expiry date from provided expiry or duration (default 30 days)
 */
const resolveExpiryDate = (expiry, durationDays = 30) => {
  if (expiry) {
    return new Date(expiry);
  }

  const result = new Date();
  result.setDate(result.getDate() + durationDays);
  return result;
};

/**
 * Create a new subscription purchase record.
 */
const purchaseSubscription = async (payload) => {
  const {
    user,
    creator,
    tierId,
    subscriptionTierId = null,
    tierName = null,
    tierPrice = null,
    tierBenefits = [],
    amount,
    expiry,
    transactionId,
    autoRenewal = true,
    gracePeriodDays = 7,
    renewalStatus = 'active',
    currency = 'USD',
    email = null
  } = payload;

  if (!user || !creator || tierId === undefined || !amount || !transactionId) {
    throw new Error('Missing required subscription purchase fields: user, creator, tierId, amount, transactionId');
  }

  const resolvedExpiry = resolveExpiryDate(expiry);
  const nextRenewalDate = new Date(resolvedExpiry);

  const subscriptionData = {
    user,
    creator,
    tierId,
    subscriptionTierId,
    tierName,
    tierPrice,
    tierBenefits,
    amount,
    expiry: resolvedExpiry,
    transactionId,
    renewalStatus,
    autoRenewal,
    gracePeriodDays,
    graceExpiresAt: null,
    nextRenewalDate,
    email,
    timestamp: new Date(),
    updatedAt: new Date()
  };

  if (subscriptionTierId && !tierName) {
    const tier = await SubscriptionTier.findById(subscriptionTierId).lean();
    if (tier) {
      subscriptionData.tierName = subscriptionData.tierName || tier.name;
      subscriptionData.tierPrice = subscriptionData.tierPrice || tier.price;
      subscriptionData.tierBenefits = subscriptionData.tierBenefits.length > 0 ? subscriptionData.tierBenefits : tier.benefits || [];
    }
  }

  const existing = await Subscription.findOne({ transactionId });
  if (existing) {
    throw new Error('A subscription with this transaction ID already exists');
  }

  const subscription = new Subscription(subscriptionData);
  await subscription.save();

  return subscription;
};

/**
 * Get active subscriptions for a user.
 */
const getActiveSubscriptionsForUser = async (user, includeInactive = false) => {
  const query = { user };

  if (!includeInactive) {
    const now = new Date();
    query.cancelledAt = null;
    query.$or = [
      { expiry: { $gt: now } },
      { graceExpiresAt: { $gt: now } }
    ];
  }

  const subscriptions = await Subscription.find(query).sort({ expiry: 1 }).lean();
  return subscriptions.map((sub) => ({
    ...sub,
    renewalState: calculateRenewalStatus(sub)
  }));
};

module.exports = {
  purchaseSubscription,
  getActiveSubscriptionsForUser
};
