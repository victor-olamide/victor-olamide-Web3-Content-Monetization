const Collaborator = require('../models/Collaborator');
const RoyaltyDistribution = require('../models/RoyaltyDistribution');
const Purchase = require('../models/Purchase');
const { calculatePlatformFee: calculatePlatformFeeOnChain } = require('./contractService');
const logger = require('../utils/logger');

const DEFAULT_PLATFORM_FEE_PERCENTAGE = 0.025;

const parsePlatformFeePercentage = () => {
  const rawValue = process.env.PLATFORM_FEE_PERCENTAGE;
  if (!rawValue) {
    return DEFAULT_PLATFORM_FEE_PERCENTAGE;
  }

  const parsed = parseFloat(rawValue);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_PLATFORM_FEE_PERCENTAGE;
  }

  return parsed > 1 ? parsed / 100 : parsed;
};

const getPlatformFeePercentage = () => parsePlatformFeePercentage();

const calculatePlatformFee = async (amount) => {
  if (typeof amount !== 'number' || amount < 0) {
    throw new Error('Amount must be a non-negative number when calculating platform fee');
  }

  const envValue = process.env.PLATFORM_FEE_PERCENTAGE;
  if (envValue !== undefined) {
    const percentage = getPlatformFeePercentage();
    return Math.floor(amount * percentage);
  }

  try {
    const fee = await calculatePlatformFeeOnChain(amount);
    if (typeof fee === 'number' && Number.isFinite(fee)) {
      return fee;
    }
  } catch (error) {
    logger.warn('Contract platform fee lookup failed, falling back to configured fee percentage', {
      error: error.message,
      feePercentage: getPlatformFeePercentage()
    });
  }

  return Math.floor(amount * getPlatformFeePercentage());
};

const calculateCreatorAmount = (amount, platformFee) => {
  if (typeof amount !== 'number' || typeof platformFee !== 'number') {
    throw new Error('Amount and platform fee must be numbers to calculate creator amount');
  }

  return Math.max(0, amount - platformFee);
};

const getCollaborators = async (contentId) => {
  try {
    if (contentId === undefined || contentId === null) {
      return [];
    }

    const collaborators = await Collaborator.find({ contentId, isActive: true });
    return collaborators;
  } catch (error) {
    throw new Error(`Failed to fetch collaborators: ${error.message}`);
  }
};

const addCollaborator = async (contentId, address, royaltyPercentage, name = null, role = 'contributor') => {
  if (!contentId || !address || typeof royaltyPercentage !== 'number') {
    throw new Error('Content ID, collaborator address, and royalty percentage are required');
  }

  const collaborator = new Collaborator({
    contentId,
    address,
    royaltyPercentage,
    name,
    role,
    isActive: true
  });

  try {
    return await collaborator.save();
  } catch (error) {
    throw new Error(`Failed to add collaborator: ${error.message}`);
  }
};

const updateCollaboratorRoyalty = async (collaboratorId, royaltyPercentage) => {
  if (!collaboratorId || typeof royaltyPercentage !== 'number') {
    throw new Error('Collaborator ID and royalty percentage are required');
  }

  const collaborator = await Collaborator.findById(collaboratorId);
  if (!collaborator) {
    throw new Error('Collaborator not found');
  }

  collaborator.royaltyPercentage = royaltyPercentage;
  return collaborator.save();
};

const removeCollaborator = async (collaboratorId) => {
  if (!collaboratorId) {
    throw new Error('Collaborator ID is required');
  }

  const collaborator = await Collaborator.findById(collaboratorId);
  if (!collaborator) {
    throw new Error('Collaborator not found');
  }

  collaborator.isActive = false;
  return collaborator.save();
};

const buildRoyaltyDistributions = async ({
  contentId = null,
  creatorAddress,
  collaborators = [],
  totalAmount,
  sourceType = 'purchase',
  purchaseId = null,
  subscriptionId = null,
  subscriptionRenewalId = null
}) => {
  if (!creatorAddress || typeof totalAmount !== 'number') {
    throw new Error('Creator address and total amount are required to build royalty distributions');
  }

  const records = [];
  let remainingAmount = totalAmount;
  const activeCollaborators = collaborators.filter(c => c.isActive !== false && c.royaltyPercentage > 0);

  for (const collaborator of activeCollaborators) {
    if (remainingAmount <= 0) {
      break;
    }

    let royaltyAmount = Math.floor((totalAmount * collaborator.royaltyPercentage) / 100);
    royaltyAmount = Math.min(royaltyAmount, remainingAmount);

    if (royaltyAmount <= 0) {
      continue;
    }

    remainingAmount -= royaltyAmount;
    const distribution = new RoyaltyDistribution({
      purchaseId,
      subscriptionId,
      subscriptionRenewalId,
      sourceType,
      contentId,
      collaboratorAddress: collaborator.address,
      royaltyPercentage: collaborator.royaltyPercentage,
      totalAmount,
      royaltyAmount,
      status: 'pending'
    });

    records.push(distribution);
  }

  if (remainingAmount > 0) {
    const ownerRoyaltyPercentage = activeCollaborators.length > 0
      ? Math.max(0, 100 - activeCollaborators.reduce((total, c) => total + c.royaltyPercentage, 0))
      : 100;

    records.push(new RoyaltyDistribution({
      purchaseId,
      subscriptionId,
      subscriptionRenewalId,
      sourceType,
      contentId,
      collaboratorAddress: creatorAddress,
      royaltyPercentage: ownerRoyaltyPercentage,
      totalAmount,
      royaltyAmount: remainingAmount,
      status: 'pending'
    }));
  }

  const savedRecords = [];
  for (const record of records) {
    savedRecords.push(await record.save());
  }

  return savedRecords;
};

const distributePurchaseRoyalties = async (purchase) => {
  try {
    if (!purchase) {
      throw new Error('Purchase object is required for royalty distribution');
    }

    const amount = purchase.amount || 0;
    const platformFee = purchase.platformFee !== undefined && purchase.platformFee !== null
      ? purchase.platformFee
      : await calculatePlatformFee(amount);

    const creatorAmount = purchase.creatorAmount !== undefined && purchase.creatorAmount !== null
      ? purchase.creatorAmount
      : calculateCreatorAmount(amount, platformFee);

    const collaborators = await getCollaborators(purchase.contentId);
    const distributions = await buildRoyaltyDistributions({
      contentId: purchase.contentId,
      creatorAddress: purchase.creator,
      collaborators,
      totalAmount: creatorAmount,
      sourceType: 'purchase',
      purchaseId: purchase._id
    });

    return distributions;
  } catch (error) {
    throw new Error(`Failed to distribute purchase royalties: ${error.message}`);
  }
};

const distributeSubscriptionRoyalties = async (subscription) => {
  try {
    if (!subscription) {
      throw new Error('Subscription object is required for royalty distribution');
    }

    const amount = subscription.renewalAmount !== undefined && subscription.renewalAmount !== null
      ? subscription.renewalAmount
      : subscription.amount || 0;

    const platformFee = subscription.platformFee !== undefined && subscription.platformFee !== null
      ? subscription.platformFee
      : await calculatePlatformFee(amount);

    const creatorAmount = subscription.creatorAmount !== undefined && subscription.creatorAmount !== null
      ? subscription.creatorAmount
      : calculateCreatorAmount(amount, platformFee);

    const collaborators = await getCollaborators(subscription.contentId);
    const distributions = await buildRoyaltyDistributions({
      contentId: subscription.contentId || null,
      creatorAddress: subscription.creator,
      collaborators,
      totalAmount: creatorAmount,
      sourceType: subscription.subscriptionRenewalId ? 'subscription-renewal' : 'subscription',
      subscriptionId: subscription._id,
      subscriptionRenewalId: subscription.subscriptionRenewalId || null
    });

    return distributions;
  } catch (error) {
    throw new Error(`Failed to distribute subscription royalties: ${error.message}`);
  }
};

const getPendingDistributions = async (collaboratorAddress) => {
  try {
    const distributions = await RoyaltyDistribution.find({
      collaboratorAddress,
      status: 'pending'
    })
      .populate('purchaseId')
      .populate('subscriptionId')
      .populate('subscriptionRenewalId')
      .sort({ createdAt: -1 });

    return distributions;
  } catch (error) {
    throw new Error(`Failed to fetch pending distributions: ${error.message}`);
  }
};

const getDistributionHistory = async (collaboratorAddress, options = {}) => {
  try {
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const distributions = await RoyaltyDistribution.find({
      collaboratorAddress
    })
      .populate('purchaseId')
      .populate('subscriptionId')
      .populate('subscriptionRenewalId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await RoyaltyDistribution.countDocuments({ collaboratorAddress });

    return { distributions, total, limit, skip };
  } catch (error) {
    throw new Error(`Failed to fetch distribution history: ${error.message}`);
  }
};

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
  getPlatformFeePercentage,
  calculatePlatformFee,
  calculateCreatorAmount,
  getCollaborators,
  addCollaborator,
  updateCollaboratorRoyalty,
  removeCollaborator,
  distributePurchaseRoyalties,
  distributeSubscriptionRoyalties,
  getPendingDistributions,
  getDistributionHistory,
  getContentRoyaltySummary,
  markDistributionCompleted,
  markDistributionFailed
};
