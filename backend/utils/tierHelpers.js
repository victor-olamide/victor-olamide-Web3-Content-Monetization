/**
 * Tier Helper Utilities
 *
 * Collection of utility functions for managing and formatting subscription tiers
 * Used across services, routes, and frontend integration
 */

const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');

// ============================================================================
// PRICING UTILITIES
// ============================================================================

/**
 * Calculate effective price with trials and introductory pricing
 * @param {Object} tier - Tier document
 * @returns {Object} Pricing breakdown
 */
function calculateEffectivePrice(tier) {
  const result = {
    regularPrice: tier.price,
    currency: tier.currency,
    billingCycle: tier.billingCycle,
    hasIntroductoryPrice: !!tier.introductoryPrice,
    hasTrial: tier.trialDays > 0,
  };

  if (tier.introductoryPrice) {
    result.introductoryPrice = tier.introductoryPrice;
    result.introductoryBillingCycle = tier.introductoryBillingCycle;
    result.savingsWithIntroductory = tier.price - tier.introductoryPrice;
  }

  if (tier.trialDays > 0) {
    result.trialDays = tier.trialDays;
    result.trialMessage = `${tier.trialDays} day free trial`;
  }

  return result;
}

/**
 * Format price for display (e.g., "$9.99/month")
 * @param {number} price - Price amount
 * @param {string} currency - Currency code
 * @param {string} billingCycle - 'monthly', 'yearly', 'lifetime'
 * @returns {string} Formatted price string
 */
function formatPrice(price, currency = 'USD', billingCycle = 'monthly') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedPrice = formatter.format(price);

  if (billingCycle === 'lifetime') {
    return `${formattedPrice} one-time`;
  }

  // Convert billing cycle to period
  const periods = {
    monthly: 'month',
    yearly: 'year',
  };

  const period = periods[billingCycle] || billingCycle;
  return `${formattedPrice}/${period}`;
}

/**
 * Calculate pro-rata pricing for tier changes
 * @param {Object} currentTier - Current subscription tier
 * @param {Object} newTier - New subscription tier
 * @param {Date} subscriptionStartDate - When current subscription started
 * @param {string} billingCycle - 'monthly' or 'yearly'
 * @returns {Object} Proration details
 */
function calculateProRataPrice(currentTier, newTier, subscriptionStartDate, billingCycle = 'monthly') {
  const now = new Date();
  const totalDays = billingCycle === 'yearly' ? 365 : 30;
  const elapsedDays = Math.floor((now - subscriptionStartDate) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const dayRate = currentTier.price / totalDays;

  const result = {
    totalDays,
    elapsedDays,
    remainingDays,
    currentTierDailyRate: dayRate,
    refundableAmount: dayRate * remainingDays,
    newTierDailyRate: newTier.price / totalDays,
    costToComplete: (newTier.price / totalDays) * remainingDays,
    balanceDue: 0,
    refund: 0,
  };

  // Calculate balance
  if (result.costToComplete > result.refundableAmount) {
    result.balanceDue = result.costToComplete - result.refundableAmount;
  } else {
    result.refund = result.refundableAmount - result.costToComplete;
  }

  return result;
}

/**
 * Calculate annual savings for yearly subscription
 * @param {number} monthlyPrice - Monthly price
 * @param {number} yearlyPrice - Yearly price (if different)
 * @returns {Object} Savings details
 */
function calculateAnnualSavings(monthlyPrice, yearlyPrice) {
  const annualMonthly = monthlyPrice * 12;
  const savings = annualMonthly - yearlyPrice;
  const savingsPercentage = (savings / annualMonthly) * 100;

  return {
    monthlyPrice,
    monthlyAnnual: annualMonthly,
    yearlyPrice: yearlyPrice || annualMonthly,
    savings: Math.max(0, savings),
    savingsPercentage: Math.max(0, savingsPercentage),
    yearlySavingsMessage: `Save ${Math.round(savingsPercentage)}% with annual billing`,
  };
}

/**
 * Get volume discount for multiple subscriptions
 * @param {number} count - Number of subscriptions
 * @returns {number} Discount percentage (0-100)
 */
function getVolumeDiscount(count) {
  if (count < 2) return 0;
  if (count < 5) return 5;
  if (count < 10) return 10;
  if (count < 20) return 15;
  return 20;
}

// ============================================================================
// TIER COMPARISON UTILITIES
// ============================================================================

/**
 * Generate tier feature comparison matrix for display
 * @param {Array<Object>} tiers - Array of tier documents
 * @returns {Object} Comparison matrix
 */
function generateTierComparisonMatrix(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { tiers: [], features: [], matrix: [] };
  }

  // Collect all unique features from all tiers
  const allFeatures = new Set();
  tiers.forEach(tier => {
    if (tier.benefits && Array.isArray(tier.benefits)) {
      tier.benefits.forEach(benefit => {
        allFeatures.add(benefit.feature);
      });
    }
  });

  const features = Array.from(allFeatures);

  // Build comparison matrix
  const matrix = tiers.map(tier => {
    const tierFeatures = {};
    const tierBenefitMap = {};

    if (tier.benefits && Array.isArray(tier.benefits)) {
      tier.benefits.forEach(benefit => {
        tierBenefitMap[benefit.feature] = benefit.included;
      });
    }

    features.forEach(feature => {
      tierFeatures[feature] = tierBenefitMap[feature] || false;
    });

    return {
      tierId: tier._id,
      tierName: tier.name,
      price: formatPrice(tier.price, tier.currency, tier.billingCycle),
      accessLevel: tier.accessLevel,
      features: tierFeatures,
    };
  });

  return {
    tiers: tiers.map(t => ({
      id: t._id,
      name: t.name,
      price: t.price,
    })),
    features,
    matrix,
  };
}

/**
 * Get features unique to a specific tier
 * @param {string} tierId - Tier ID to compare
 * @param {Array<Object>} otherTiers - Other tiers to compare against
 * @returns {Array<string>} Unique features
 */
function getUniqueFeatures(tierId, tier, otherTiers) {
  const tierFeatures = new Set(
    tier.benefits?.map(b => b.feature).filter(f => tier.benefits.find(b => b.feature === f && b.included)) || []
  );

  const otherFeatures = new Set();
  otherTiers.forEach(other => {
    other.benefits?.forEach(benefit => {
      if (benefit.included) otherFeatures.add(benefit.feature);
    });
  });

  return Array.from(tierFeatures).filter(f => !otherFeatures.has(f));
}

/**
 * Get common features across multiple tiers
 * @param {Array<Object>} tiers - Tiers to analyze
 * @returns {Array<string>} Common features
 */
function getCommonFeatures(tiers) {
  if (tiers.length === 0) return [];

  const featureSets = tiers.map(tier => {
    return new Set(
      tier.benefits?.map(b => b.feature).filter(f => tier.benefits.find(b => b.feature === f && b.included)) || []
    );
  });

  // Find intersection
  let common = new Set(featureSets[0]);
  for (let i = 1; i < featureSets.length; i++) {
    common = new Set([...common].filter(x => featureSets[i].has(x)));
  }

  return Array.from(common);
}

// ============================================================================
// TIER HIERARCHY UTILITIES
// ============================================================================

/**
 * Build tier hierarchy with categorization
 * @param {Array<Object>} tiers - Tier documents
 * @returns {Object} Categorized tiers
 */
function buildTierHierarchy(tiers) {
  const sorted = tiers.sort((a, b) => a.position - b.position);

  const hierarchy = {
    entry: [],    // Lowest price tier
    mid: [],      // Middle tiers
    premium: [],  // Highest tier
    popular: [],  // Marked as popular
  };

  sorted.forEach((tier, index) => {
    if (tier.isPopular) {
      hierarchy.popular.push(tier);
    } else if (index === 0) {
      hierarchy.entry.push(tier);
    } else if (index === sorted.length - 1) {
      hierarchy.premium.push(tier);
    } else {
      hierarchy.mid.push(tier);
    }
  });

  return hierarchy;
}

/**
 * Get tier recommendations for subscriber based on engagement
 * @param {number} accessLevel - Current access level
 * @param {Array<Object>} tiers - Available tiers
 * @returns {Array<Object>} Recommended tiers
 */
function getRecommendedTiers(currentAccessLevel, tiers) {
  // Find tiers that are upgrades
  const upgrades = tiers
    .filter(t => t.isActive && t.isVisible && t.accessLevel > currentAccessLevel)
    .sort((a, b) => a.accessLevel - b.accessLevel)
    .slice(0, 2); // Top 2 upgrades

  return upgrades.map(tier => ({
    tierId: tier._id,
    name: tier.name,
    price: tier.price,
    accessLevelGain: tier.accessLevel - currentAccessLevel,
    topBenefits: tier.benefits?.filter(b => b.included).slice(0, 3) || [],
  }));
}

// ============================================================================
// TIER VALIDATION UTILITIES
// ============================================================================

/**
 * Validate tier data before creation/update
 * @param {Object} tierData - Tier data to validate
 * @returns {Object} Validation result { isValid, errors }
 */
function validateTierData(tierData) {
  const errors = [];

  // Required fields
  if (!tierData.name || typeof tierData.name !== 'string' || tierData.name.trim().length === 0) {
    errors.push('Tier name is required and must be a non-empty string');
  } else if (tierData.name.length > 100) {
    errors.push('Tier name cannot exceed 100 characters');
  }

  if (tierData.price === undefined || typeof tierData.price !== 'number') {
    errors.push('Tier price is required and must be a number');
  } else if (tierData.price < 0) {
    errors.push('Tier price cannot be negative');
  }

  // Optional fields with constraints
  if (tierData.description && typeof tierData.description === 'string' && tierData.description.length > 1000) {
    errors.push('Tier description cannot exceed 1000 characters');
  }

  if (tierData.accessLevel) {
    if (typeof tierData.accessLevel !== 'number') {
      errors.push('Access level must be a number');
    } else if (tierData.accessLevel < 1 || tierData.accessLevel > 10) {
      errors.push('Access level must be between 1 and 10');
    }
  }

  if (tierData.trialDays) {
    if (typeof tierData.trialDays !== 'number' || tierData.trialDays < 0) {
      errors.push('Trial days must be a non-negative number');
    }
  }

  if (tierData.maxSubscribers) {
    if (typeof tierData.maxSubscribers !== 'number' || tierData.maxSubscribers <= 0) {
      errors.push('Max subscribers must be a positive number');
    }
  }

  if (tierData.benefits && !Array.isArray(tierData.benefits)) {
    errors.push('Benefits must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if tier can be upgraded from another tier
 * @param {Object} fromTier - Current tier
 * @param {Object} toTier - Tier to upgrade to
 * @returns {Object} Upgrade eligibility details
 */
function checkUpgradeEligibility(fromTier, toTier) {
  const result = {
    canUpgrade: true,
    reason: '',
    priceIncrease: toTier.price - fromTier.price,
    accessGain: toTier.accessLevel - fromTier.accessLevel,
  };

  if (toTier.accessLevel <= fromTier.accessLevel) {
    result.canUpgrade = false;
    result.reason = 'Target tier does not provide higher access level';
  }

  if (toTier.price === fromTier.price) {
    result.reason = 'Lateral tier change - no price difference';
  }

  return result;
}

/**
 * Check if tier can be downgraded from another tier
 * @param {Object} fromTier - Current tier
 * @param {Object} toTier - Tier to downgrade to
 * @returns {Object} Downgrade eligibility details
 */
function checkDowngradeEligibility(fromTier, toTier) {
  const result = {
    canDowngrade: true,
    reason: '',
    priceDecrease: fromTier.price - toTier.price,
    accessLoss: fromTier.accessLevel - toTier.accessLevel,
    potentialRefund: Math.max(0, fromTier.price - toTier.price),
  };

  if (toTier.accessLevel >= fromTier.accessLevel) {
    result.canDowngrade = false;
    result.reason = 'Target tier does not provide lower access level';
  }

  if (toTier.price === fromTier.price) {
    result.reason = 'Lateral tier change - no price difference';
    result.potentialRefund = 0;
  }

  return result;
}

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

/**
 * Calculate tier adoption metrics
 * @param {Object} tier - Tier document
 * @param {number} totalSubscribers - Total subscribers across all tiers
 * @returns {Object} Adoption metrics
 */
function calculateAdoptionMetrics(tier, totalSubscribers) {
  const adoption = totalSubscribers > 0 ? (tier.currentSubscriberCount / totalSubscribers) * 100 : 0;
  const revenuePerSubscriber = tier.currentSubscriberCount > 0 ? tier.revenueTotal / tier.currentSubscriberCount : 0;
  const avgRevenuePerMonth = tier.revenueTotal / 12; // Rough estimate

  return {
    subscriberCount: tier.currentSubscriberCount,
    totalSubscribers,
    adoptionPercentage: parseFloat(adoption.toFixed(2)),
    revenuePerSubscriber: parseFloat(revenuePerSubscriber.toFixed(2)),
    totalRevenue: tier.revenueTotal,
    estimatedMonthlyRevenue: parseFloat(avgRevenuePerMonth.toFixed(2)),
    churnRate: tier.averageChurn || 0,
  };
}

/**
 * Forecast tier revenue based on growth
 * @param {Object} tier - Tier document
 * @param {number} growthRate - Monthly growth rate (0.1 = 10%)
 * @param {number} months - Number of months to forecast
 * @returns {Array<Object>} Revenue forecast by month
 */
function forecastTierRevenue(tier, growthRate = 0.05, months = 12) {
  const forecast = [];
  let currentSubscribers = tier.currentSubscriberCount;
  const monthlyRevenue = tier.revenueTotal / 12;

  for (let i = 0; i < months; i++) {
    currentSubscribers = currentSubscribers * (1 + growthRate);
    forecast.push({
      month: i + 1,
      projectedSubscribers: Math.round(currentSubscribers),
      projectedRevenue: parseFloat((monthlyRevenue * (1 + growthRate) ** (i + 1)).toFixed(2)),
    });
  }

  return forecast;
}

/**
 * Analyze tier performance compared to target metrics
 * @param {Object} tier - Tier document
 * @param {Object} targets - Target metrics
 * @returns {Object} Performance analysis
 */
function analyzePerformance(tier, targets = {}) {
  const defaultTargets = {
    minSubscribers: 10,
    minMonthlyRevenue: 100,
    maxChurnRate: 10,
  };

  const goals = { ...defaultTargets, ...targets };
  const monthlyRevenue = tier.revenueTotal / 12;

  return {
    subscribers: {
      actual: tier.currentSubscriberCount,
      target: goals.minSubscribers,
      status: tier.currentSubscriberCount >= goals.minSubscribers ? 'ON_TRACK' : 'BELOW_TARGET',
      percentOfTarget: parseFloat(((tier.currentSubscriberCount / goals.minSubscribers) * 100).toFixed(2)),
    },
    revenue: {
      actual: parseFloat(monthlyRevenue.toFixed(2)),
      target: goals.minMonthlyRevenue,
      status: monthlyRevenue >= goals.minMonthlyRevenue ? 'ON_TRACK' : 'BELOW_TARGET',
      percentOfTarget: parseFloat(((monthlyRevenue / goals.minMonthlyRevenue) * 100).toFixed(2)),
    },
    churn: {
      actual: tier.averageChurn,
      target: goals.maxChurnRate,
      status: tier.averageChurn <= goals.maxChurnRate ? 'HEALTHY' : 'NEEDS_ATTENTION',
    },
  };
}

// ============================================================================
// DATA FORMATTING UTILITIES
// ============================================================================

/**
 * Format tier for API response
 * @param {Object} tier - Tier document
 * @param {boolean} includeAnalytics - Include analytics data
 * @returns {Object} Formatted tier
 */
function formatTierForResponse(tier, includeAnalytics = false) {
  const formatted = {
    id: tier._id,
    name: tier.name,
    description: tier.description,
    price: tier.price,
    formattedPrice: formatPrice(tier.price, tier.currency, tier.billingCycle),
    currency: tier.currency,
    billingCycle: tier.billingCycle,
    benefits: tier.benefits || [],
    accessLevel: tier.accessLevel,
    contentAccess: tier.contentAccess || [],
    downloadLimit: tier.downloadLimit,
    maxSubscribers: tier.maxSubscribers,
    waitlistEnabled: tier.waitlistEnabled,
    trialDays: tier.trialDays,
    isActive: tier.isActive,
    isVisible: tier.isVisible,
    visibility: tier.visibility,
    isPopular: tier.isPopular,
    position: tier.position,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
  };

  if (includeAnalytics) {
    formatted.analytics = {
      subscribers: tier.currentSubscriberCount,
      revenue: tier.revenueTotal,
      churnRate: tier.averageChurn,
      purchaseCount: tier.purchaseCount,
    };
  }

  return formatted;
}

/**
 * Format multiple tiers for response
 * @param {Array<Object>} tiers - Tier documents
 * @param {boolean} includeAnalytics - Include analytics data
 * @returns {Array<Object>} Formatted tiers
 */
function formatTiersForResponse(tiers, includeAnalytics = false) {
  return tiers.map(tier => formatTierForResponse(tier, includeAnalytics));
}

/**
 * Export tier data for analytics/reporting
 * @param {Object} tier - Tier document
 * @returns {Object} Exportable tier data
 */
function exportTierData(tier) {
  return {
    tierId: tier._id.toString(),
    creatorId: tier.creatorId.toString(),
    name: tier.name,
    price: tier.price,
    currency: tier.currency,
    billingCycle: tier.billingCycle,
    currentSubscribers: tier.currentSubscriberCount,
    totalRevenue: tier.revenueTotal,
    churnRate: tier.averageChurn,
    accessLevel: tier.accessLevel,
    isActive: tier.isActive,
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
    benefits: tier.benefits?.map(b => b.feature) || [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Pricing utilities
  calculateEffectivePrice,
  formatPrice,
  calculateProRataPrice,
  calculateAnnualSavings,
  getVolumeDiscount,

  // Tier comparison utilities
  generateTierComparisonMatrix,
  getUniqueFeatures,
  getCommonFeatures,

  // Tier hierarchy utilities
  buildTierHierarchy,
  getRecommendedTiers,

  // Validation utilities
  validateTierData,
  checkUpgradeEligibility,
  checkDowngradeEligibility,

  // Analytics utilities
  calculateAdoptionMetrics,
  forecastTierRevenue,
  analyzePerformance,

  // Data formatting utilities
  formatTierForResponse,
  formatTiersForResponse,
  exportTierData,
};
