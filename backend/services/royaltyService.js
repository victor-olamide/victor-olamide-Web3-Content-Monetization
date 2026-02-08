const Collaborator = require('../models/Collaborator');
const RoyaltyDistribution = require('../models/RoyaltyDistribution');
const Purchase = require('../models/Purchase');

/**
 * Get all collaborators for a content
 * @param {number} contentId - Content ID
 * @returns {Promise<Array>} Array of collaborators
 */
const getCollaborators = async (contentId) => {
  try {
    const collaborators = await Collaborator.find({ contentId, isActive: true });
    return collaborators;
  } catch (error) {
    throw new Error(`Failed to fetch collaborators: ${error.message}`);
  }
};

/**
 * Add a collaborator to content
 * @param {number} contentId - Content ID
 * @param {string} address - Collaborator address
 * @param {number} royaltyPercentage - Royalty percentage (0-100)
 * @param {string} name - Collaborator name
 * @param {string} role - Collaborator role
 * @returns {Promise<Object>} Created collaborator
 */
const addCollaborator = async (contentId, address, royaltyPercentage, name, role) => {
  try {
    // Validate royalty percentage
    if (royaltyPercentage < 0 || royaltyPercentage > 100) {
      throw new Error('Royalty percentage must be between 0 and 100');
    }

    // Check total royalty allocation
    const existingCollaborators = await Collaborator.find({ contentId, isActive: true });
    const totalRoyalty = existingCollaborators.reduce((sum, c) => sum + c.royaltyPercentage, 0);
    
    if (totalRoyalty + royaltyPercentage > 100) {
      throw new Error(`Total royalty allocation would exceed 100% (current: ${totalRoyalty}%, adding: ${royaltyPercentage}%)`);
    }

    const collaborator = new Collaborator({
      contentId,
      address,
      royaltyPercentage,
      name: name || null,
      role: role || 'contributor'
    });

    const saved = await collaborator.save();
    return saved;
  } catch (error) {
    throw new Error(`Failed to add collaborator: ${error.message}`);
  }
};

/**
 * Update a collaborator's royalty percentage
 * @param {string} collaboratorId - Collaborator MongoDB ID
 * @param {number} newRoyaltyPercentage - New royalty percentage
 * @returns {Promise<Object>} Updated collaborator
 */
const updateCollaboratorRoyalty = async (collaboratorId, newRoyaltyPercentage) => {
  try {
    if (newRoyaltyPercentage < 0 || newRoyaltyPercentage > 100) {
      throw new Error('Royalty percentage must be between 0 and 100');
    }

    const collaborator = await Collaborator.findById(collaboratorId);
    if (!collaborator) {
      throw new Error('Collaborator not found');
    }

    // Check total royalty allocation
    const existingCollaborators = await Collaborator.find({ 
      contentId: collaborator.contentId, 
      isActive: true,
      _id: { $ne: collaboratorId }
    });
    const totalRoyalty = existingCollaborators.reduce((sum, c) => sum + c.royaltyPercentage, 0);
    
    if (totalRoyalty + newRoyaltyPercentage > 100) {
      throw new Error(`Total royalty allocation would exceed 100%`);
    }

    collaborator.royaltyPercentage = newRoyaltyPercentage;
    const updated = await collaborator.save();
    return updated;
  } catch (error) {
    throw new Error(`Failed to update collaborator: ${error.message}`);
  }
};

/**
 * Remove a collaborator from content
 * @param {string} collaboratorId - Collaborator MongoDB ID
 * @returns {Promise<void>}
 */
const removeCollaborator = async (collaboratorId) => {
  try {
    const collaborator = await Collaborator.findById(collaboratorId);
    if (!collaborator) {
      throw new Error('Collaborator not found');
    }
    
    collaborator.isActive = false;
    await collaborator.save();
  } catch (error) {
    throw new Error(`Failed to remove collaborator: ${error.message}`);
  }
};

/**
 * Distribute royalties from a purchase to collaborators
 * @param {Object} purchase - Purchase record
 * @returns {Promise<Array>} Array of distribution records
 */
const distributePurchaseRoyalties = async (purchase) => {
  try {
    const collaborators = await getCollaborators(purchase.contentId);
    
    if (collaborators.length === 0) {
      return []; // No collaborators, no distributions needed
    }

    const distributions = [];
    const creatorAmount = purchase.creatorAmount;

    for (const collaborator of collaborators) {
      const royaltyAmount = Math.floor((creatorAmount * collaborator.royaltyPercentage) / 100);
      
      if (royaltyAmount > 0) {
        const distribution = new RoyaltyDistribution({
          purchaseId: purchase._id,
          contentId: purchase.contentId,
          collaboratorAddress: collaborator.address,
          royaltyPercentage: collaborator.royaltyPercentage,
          totalAmount: creatorAmount,
          royaltyAmount,
          status: 'pending'
        });

        const saved = await distribution.save();
        distributions.push(saved);
      }
    }

    return distributions;
  } catch (error) {
    throw new Error(`Failed to distribute royalties: ${error.message}`);
  }
};

/**
 * Get pending distributions for a collaborator
 * @param {string} collaboratorAddress - Collaborator address
 * @returns {Promise<Array>} Array of pending distributions
 */
const getPendingDistributions = async (collaboratorAddress) => {
  try {
    const distributions = await RoyaltyDistribution.find({
      collaboratorAddress,
      status: 'pending'
    }).populate('purchaseId').sort({ createdAt: -1 });
    
    return distributions;
  } catch (error) {
    throw new Error(`Failed to fetch pending distributions: ${error.message}`);
  }
};

/**
 * Get distribution history for a collaborator
 * @param {string} collaboratorAddress - Collaborator address
 * @param {Object} options - Query options (limit, skip, etc.)
 * @returns {Promise<Array>} Array of distributions
 */
const getDistributionHistory = async (collaboratorAddress, options = {}) => {
  try {
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const distributions = await RoyaltyDistribution.find({
      collaboratorAddress
    })
      .populate('purchaseId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await RoyaltyDistribution.countDocuments({ collaboratorAddress });

    return { distributions, total, limit, skip };
  } catch (error) {
    throw new Error(`Failed to fetch distribution history: ${error.message}`);
  }
};

/**
 * Get royalty summary for a content
 * @param {number} contentId - Content ID
 * @returns {Promise<Object>} Royalty summary with collaborator details and earnings
 */
const getContentRoyaltySummary = async (contentId) => {
  try {
    const collaborators = await getCollaborators(contentId);
    const distributions = await RoyaltyDistribution.find({ contentId });

    const summary = {
      contentId,
      totalCollaborators: collaborators.length,
      collaborators: collaborators.map(c => ({
        address: c.address,
        name: c.name,
        role: c.role,
        royaltyPercentage: c.royaltyPercentage,
        totalEarnings: 0
      }))
    };

    // Calculate earnings per collaborator
    for (const distribution of distributions) {
      const collab = summary.collaborators.find(c => c.address === distribution.collaboratorAddress);
      if (collab && distribution.status === 'completed') {
        collab.totalEarnings += distribution.royaltyAmount;
      }
    }

    return summary;
  } catch (error) {
    throw new Error(`Failed to fetch royalty summary: ${error.message}`);
  }
};

/**
 * Mark distribution as completed (called after successful payout)
 * @param {string} distributionId - Distribution MongoDB ID
 * @param {string} txId - Transaction ID from blockchain
 * @returns {Promise<Object>} Updated distribution
 */
const markDistributionCompleted = async (distributionId, txId) => {
  try {
    const distribution = await RoyaltyDistribution.findById(distributionId);
    if (!distribution) {
      throw new Error('Distribution not found');
    }

    distribution.status = 'completed';
    distribution.txId = txId;
    distribution.distributedAt = new Date();

    const updated = await distribution.save();
    return updated;
  } catch (error) {
    throw new Error(`Failed to mark distribution completed: ${error.message}`);
  }
};

/**
 * Mark distribution as failed
 * @param {string} distributionId - Distribution MongoDB ID
 * @param {string} reason - Failure reason
 * @returns {Promise<Object>} Updated distribution
 */
const markDistributionFailed = async (distributionId, reason) => {
  try {
    const distribution = await RoyaltyDistribution.findById(distributionId);
    if (!distribution) {
      throw new Error('Distribution not found');
    }

    distribution.status = 'failed';
    distribution.failureReason = reason;

    const updated = await distribution.save();
    return updated;
  } catch (error) {
    throw new Error(`Failed to mark distribution failed: ${error.message}`);
  }
};

module.exports = {
  getCollaborators,
  addCollaborator,
  updateCollaboratorRoyalty,
  removeCollaborator,
  distributePurchaseRoyalties,
  getPendingDistributions,
  getDistributionHistory,
  getContentRoyaltySummary,
  markDistributionCompleted,
  markDistributionFailed
};
