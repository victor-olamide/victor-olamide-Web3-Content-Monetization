const calculateExpiryDate = (expiry, durationDays = 30) => {
  if (expiry) {
    const date = new Date(expiry);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const result = new Date();
  result.setDate(result.getDate() + durationDays);
  return result;
};

const buildSubscriptionDocument = (payload, resolvedExpiry, nextRenewalDate) => ({
  user: payload.user,
  creator: payload.creator,
  tierId: payload.tierId,
  subscriptionTierId: payload.subscriptionTierId || null,
  tierName: payload.tierName || null,
  tierPrice: payload.tierPrice || null,
  tierBenefits: payload.tierBenefits || [],
  amount: payload.amount,
  expiry: resolvedExpiry,
  transactionId: payload.transactionId,
  renewalStatus: 'active',
  autoRenewal: payload.autoRenewal !== false,
  gracePeriodDays: payload.gracePeriodDays || 7,
  graceExpiresAt: null,
  nextRenewalDate,
  email: payload.email || null,
  currency: payload.currency || 'USD',
  timestamp: new Date(),
  updatedAt: new Date()
});

const buildActiveSubscriptionQuery = (user, includeInactive = false) => {
  if (includeInactive) {
    return { user };
  }

  const now = new Date();
  return {
    user,
    cancelledAt: null,
    $or: [
      { expiry: { $gt: now } },
      { graceExpiresAt: { $gt: now } }
    ]
  };
};

module.exports = {
  calculateExpiryDate,
  buildSubscriptionDocument,
  buildActiveSubscriptionQuery
};
