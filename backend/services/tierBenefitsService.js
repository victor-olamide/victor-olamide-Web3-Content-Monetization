// Subscription Tier Benefits Service
// Manages benefits/features for subscription tiers

const SubscriptionTier = require('../models/SubscriptionTier');
const TierLogger = require('../utils/subscriptionTierLogger');

const logger = new TierLogger('TierBenefitsService');

/**
 * Add a benefit to a tier
 * @param {string} tierId - Tier ID
 * @param {Object} benefit - Benefit object with feature, description, included
 * @returns {Object} Updated tier
 */
const addBenefitToTier = async (tierId, benefit) => {
  try {
    if (!tierId || !benefit || !benefit.feature) {
      logger.logValidationFailure('addBenefitToTier', 'Missing required benefit data');
      return { success: false, error: 'Tier ID and benefit with feature name are required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    if (!tier) {
      logger.logError('addBenefitToTier', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    // Check for duplicate benefit
    const benefitExists = tier.benefits.some(b => b.feature.toLowerCase() === benefit.feature.toLowerCase());
    if (benefitExists) {
      logger.logValidationFailure('addBenefitToTier', 'Duplicate benefit feature');
      return { success: false, error: 'This benefit already exists in this tier' };
    }

    const newBenefit = {
      feature: benefit.feature,
      description: benefit.description || null,
      included: benefit.included !== false
    };

    tier.benefits.push(newBenefit);
    await tier.save();

    logger.logTierUpdated(tierId, { action: 'benefit_added', feature: benefit.feature });
    return { success: true, tier, message: 'Benefit added successfully' };
  } catch (error) {
    logger.logError('addBenefitToTier', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a benefit from a tier
 * @param {string} tierId - Tier ID
 * @param {number} benefitIndex - Index of the benefit to remove
 * @returns {Object} Updated tier
 */
const removeBenefitFromTier = async (tierId, benefitIndex) => {
  try {
    if (!tierId || benefitIndex === undefined) {
      logger.logValidationFailure('removeBenefitFromTier', 'Missing required parameters');
      return { success: false, error: 'Tier ID and benefit index are required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    if (!tier) {
      logger.logError('removeBenefitFromTier', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    if (benefitIndex < 0 || benefitIndex >= tier.benefits.length) {
      logger.logValidationFailure('removeBenefitFromTier', 'Invalid benefit index');
      return { success: false, error: 'Invalid benefit index' };
    }

    const removedBenefit = tier.benefits.splice(benefitIndex, 1)[0];
    await tier.save();

    logger.logTierUpdated(tierId, { action: 'benefit_removed', feature: removedBenefit.feature });
    return { success: true, tier, message: 'Benefit removed successfully' };
  } catch (error) {
    logger.logError('removeBenefitFromTier', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a benefit in a tier
 * @param {string} tierId - Tier ID
 * @param {number} benefitIndex - Index of the benefit to update
 * @param {Object} benefitData - Updated benefit data
 * @returns {Object} Updated tier
 */
const updateBenefitInTier = async (tierId, benefitIndex, benefitData) => {
  try {
    if (!tierId || benefitIndex === undefined || !benefitData) {
      logger.logValidationFailure('updateBenefitInTier', 'Missing required parameters');
      return { success: false, error: 'Tier ID, benefit index, and benefit data are required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    if (!tier) {
      logger.logError('updateBenefitInTier', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    if (benefitIndex < 0 || benefitIndex >= tier.benefits.length) {
      logger.logValidationFailure('updateBenefitInTier', 'Invalid benefit index');
      return { success: false, error: 'Invalid benefit index' };
    }

    const benefit = tier.benefits[benefitIndex];

    if (benefitData.feature) {
      // Check for duplicate benefit name
      const duplicateExists = tier.benefits.some(
        (b, idx) => idx !== benefitIndex && b.feature.toLowerCase() === benefitData.feature.toLowerCase()
      );
      if (duplicateExists) {
        logger.logValidationFailure('updateBenefitInTier', 'Duplicate benefit feature');
        return { success: false, error: 'Another benefit with this name already exists' };
      }
      benefit.feature = benefitData.feature;
    }

    if (benefitData.description !== undefined) {
      benefit.description = benefitData.description;
    }

    if (benefitData.included !== undefined) {
      benefit.included = benefitData.included;
    }

    await tier.save();

    logger.logTierUpdated(tierId, { action: 'benefit_updated', feature: benefit.feature });
    return { success: true, tier, message: 'Benefit updated successfully' };
  } catch (error) {
    logger.logError('updateBenefitInTier', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all benefits for a tier
 * @param {string} tierId - Tier ID
 * @returns {Object} List of benefits
 */
const getTierBenefits = async (tierId) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('getTierBenefits', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    const tier = await SubscriptionTier.findById(tierId).select('benefits name');
    if (!tier) {
      logger.logError('getTierBenefits', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    logger.logTierFetched(tierId, 'benefits');
    return { success: true, tierName: tier.name, benefits: tier.benefits };
  } catch (error) {
    logger.logError('getTierBenefits', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get included benefits (features) only
 * @param {string} tierId - Tier ID
 * @returns {Object} List of included benefits
 */
const getIncludedBenefits = async (tierId) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('getIncludedBenefits', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    const tier = await SubscriptionTier.findById(tierId).select('benefits name');
    if (!tier) {
      logger.logError('getIncludedBenefits', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    const includedBenefits = tier.benefits.filter(b => b.included);

    return { success: true, tierName: tier.name, benefits: includedBenefits };
  } catch (error) {
    logger.logError('getIncludedBenefits', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk update benefits for a tier
 * @param {string} tierId - Tier ID
 * @param {Array} benefitsData - Array of benefits to set
 * @returns {Object} Updated tier
 */
const setBenefitsForTier = async (tierId, benefitsData) => {
  try {
    if (!tierId || !Array.isArray(benefitsData)) {
      logger.logValidationFailure('setBenefitsForTier', 'Missing required parameters');
      return { success: false, error: 'Tier ID and benefits array are required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    if (!tier) {
      logger.logError('setBenefitsForTier', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    // Validate benefits
    for (const benefit of benefitsData) {
      if (!benefit.feature) {
        return { success: false, error: 'Each benefit must have a feature name' };
      }
    }

    tier.benefits = benefitsData;
    await tier.save();

    logger.logTierUpdated(tierId, { action: 'benefits_bulk_updated', count: benefitsData.length });
    return { success: true, tier, message: 'Benefits updated successfully' };
  } catch (error) {
    logger.logError('setBenefitsForTier', tierId, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  addBenefitToTier,
  removeBenefitFromTier,
  updateBenefitInTier,
  getTierBenefits,
  getIncludedBenefits,
  setBenefitsForTier
};
