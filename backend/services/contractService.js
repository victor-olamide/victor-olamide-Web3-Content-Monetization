const {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  boolCV,
  stringAsciiCV,
  principalCV,
  AnchorMode,
  PostConditionMode,
} = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');

const network = process.env.NODE_ENV === 'production' ? new StacksMainnet() : new StacksTestnet();

const getPlatformFee = async () => {
  const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
  
  const result = await callReadOnlyFunction({
    contractAddress: process.env.CONTRACT_ADDRESS,
    contractName: 'pay-per-view',
    functionName: 'get-platform-fee',
    functionArgs: [],
    network,
    senderAddress: process.env.CONTRACT_ADDRESS,
  });
  
  return cvToJSON(result).value;
};

const calculatePlatformFee = async (amount) => {
  const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
  
  const result = await callReadOnlyFunction({
    contractAddress: process.env.CONTRACT_ADDRESS,
    contractName: 'pay-per-view',
    functionName: 'calculate-platform-fee',
    functionArgs: [uintCV(amount)],
    network,
    senderAddress: process.env.CONTRACT_ADDRESS,
  });
  
  return cvToJSON(result).value;
};

const addContentToContract = async (contentId, price, uri, privateKey) => {
  const txOptions = {
    contractAddress: process.env.CONTRACT_ADDRESS,
    contractName: 'pay-per-view',
    functionName: 'add-content',
    functionArgs: [uintCV(contentId), uintCV(price), stringAsciiCV(uri)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  
  return broadcastResponse;
};

const removeContentFromContract = async (contentId, privateKey) => {
  const txOptions = {
    contractAddress: process.env.CONTRACT_ADDRESS,
    contractName: 'pay-per-view',
    functionName: 'remove-content',
    functionArgs: [uintCV(contentId)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  
  return broadcastResponse;
};

/**
 * Pause the pay-per-view contract (admin only)
 * @param {string} privateKey
 * @returns {Promise<Object>} Broadcast response
 */
const pauseContract = async (privateKey) => {
  const txOptions = {
    contractAddress: process.env.CONTRACT_ADDRESS,
    contractName: 'pay-per-view',
    functionName: 'pause-contract',
    functionArgs: [],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  return broadcastResponse;
};

/**
 * Unpause the pay-per-view contract (admin only)
 * @param {string} privateKey
 * @returns {Promise<Object>} Broadcast response
 */
const unpauseContract = async (privateKey) => {
  const txOptions = {
    contractAddress: process.env.CONTRACT_ADDRESS,
    contractName: 'pay-per-view',
    functionName: 'unpause-contract',
    functionArgs: [],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  return broadcastResponse;
};

/**
 * Get paused state of the contract (read-only)
 * @returns {Promise<boolean>} paused
 */
const getContractPaused = async () => {
  try {
    const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
    const result = await callReadOnlyFunction({
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'get-paused',
      functionArgs: [],
      network,
      senderAddress: process.env.CONTRACT_ADDRESS,
    });

    return cvToJSON(result).value;
  } catch (error) {
    throw new Error(`Failed to get contract paused state: ${error.message}`);
  }
};

/**
 * Issue a rental license on-chain
 * @param {string} user - User principal address
 * @param {number} contentId - Content ID
 * @param {string} licenseType - License type (rental-24h, rental-7d, etc)
 * @param {number} expiresAtBlock - Block height when license expires
 * @param {string} privateKey - Signer private key (admin)
 * @returns {Promise<Object>} Broadcast response
 */
const issueRentalLicense = async (user, contentId, licenseType, expiresAtBlock, privateKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'issue-rental-license',
      functionArgs: [
        principalCV(user),
        uintCV(contentId),
        stringAsciiCV(licenseType),
        uintCV(expiresAtBlock)
      ],
      senderKey: privateKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse;
  } catch (error) {
    throw new Error(`Failed to issue rental license: ${error.message}`);
  }
};

/**
 * Revoke a rental license on-chain
 * @param {string} user - User principal address
 * @param {number} contentId - Content ID
 * @param {string} privateKey - Signer private key (admin)
 * @returns {Promise<Object>} Broadcast response
 */
const revokeRentalLicense = async (user, contentId, privateKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'revoke-rental-license',
      functionArgs: [
        principalCV(user),
        uintCV(contentId)
      ],
      senderKey: privateKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse;
  } catch (error) {
    throw new Error(`Failed to revoke rental license: ${error.message}`);
  }
};

/**
 * Check if user has valid rental license (read-only)
 * @param {string} user - User principal address
 * @param {number} contentId - Content ID
 * @returns {Promise<boolean>} Has valid license
 */
const hasValidRentalLicense = async (user, contentId) => {
  try {
    const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
    const result = await callReadOnlyFunction({
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'has-valid-rental-license',
      functionArgs: [
        principalCV(user),
        uintCV(contentId)
      ],
      network,
      senderAddress: process.env.CONTRACT_ADDRESS,
    });

    return cvToJSON(result).value;
  } catch (error) {
    throw new Error(`Failed to check rental license: ${error.message}`);
  }
};

/**
 * Update content price on-chain
 * @param {number} contentId
 * @param {number} newPrice
 * @param {string} privateKey
 * @returns {Promise<Object>} Broadcast response with transaction ID
 */
const updateContentPrice = async (contentId, newPrice, privateKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'update-content-price',
      functionArgs: [uintCV(contentId), uintCV(newPrice)],
      senderKey: privateKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse;
  } catch (error) {
    throw new Error(`Failed to update content price on blockchain: ${error.message}`);
  }
};

/**
 * Create a subscription tier on-chain
 * @param {number} tierId - Tier ID
 * @param {number} price - Tier price in uSTX
 * @param {number} duration - Subscription duration in days
 * @param {string} senderKey - Private key for creator wallet
 * @returns {Promise<Object>} Broadcast response
 */
const createSubscriptionTier = async (tierId, price, duration, senderKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'create-tier',
      functionArgs: [
        uintCV(tierId),
        uintCV(price),
        uintCV(duration)
      ],
      senderKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    return await broadcastTransaction(transaction, network);
  } catch (error) {
    throw new Error(`Failed to create subscription tier: ${error.message}`);
  }
};

/**
 * Subscribe to a creator's tier on-chain
 * @param {string} creatorPrincipal - Creator principal address
 * @param {number} tierId - Tier ID
 * @param {string} senderKey - Subscriber private key
 * @returns {Promise<Object>} Broadcast response
 */
const subscribeToTier = async (creatorPrincipal, tierId, senderKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'subscribe',
      functionArgs: [
        principalCV(creatorPrincipal),
        uintCV(tierId)
      ],
      senderKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    return await broadcastTransaction(transaction, network);
  } catch (error) {
    throw new Error(`Failed to subscribe to tier: ${error.message}`);
  }
};

/**
 * Renew a subscription on-chain
 * @param {string} creatorPrincipal - Creator principal address
 * @param {number} tierId - Tier ID
 * @param {string} senderKey - Subscriber private key
 * @returns {Promise<Object>} Broadcast response
 */
const renewSubscription = async (creatorPrincipal, tierId, senderKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'renew-subscription',
      functionArgs: [
        principalCV(creatorPrincipal),
        uintCV(tierId)
      ],
      senderKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    return await broadcastTransaction(transaction, network);
  } catch (error) {
    throw new Error(`Failed to renew subscription: ${error.message}`);
  }
};

/**
 * Update a subscription tier on-chain
 * @param {number} tierId - Tier ID
 * @param {number} newPrice - New tier price in uSTX
 * @param {number} newDuration - New duration in days
 * @param {boolean} isActive - Whether tier is active
 * @param {string} senderKey - Creator private key
 * @returns {Promise<Object>} Broadcast response
 */
const updateSubscriptionTier = async (tierId, newPrice, newDuration, isActive, senderKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'update-tier',
      functionArgs: [
        uintCV(tierId),
        uintCV(newPrice),
        uintCV(newDuration),
        boolCV(isActive)
      ],
      senderKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    return await broadcastTransaction(transaction, network);
  } catch (error) {
    throw new Error(`Failed to update subscription tier: ${error.message}`);
  }
};

/**
 * Deactivate a subscription tier on-chain
 * @param {number} tierId - Tier ID
 * @param {string} senderKey - Creator private key
 * @returns {Promise<Object>} Broadcast response
 */
const deactivateSubscriptionTier = async (tierId, senderKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'deactivate-tier',
      functionArgs: [uintCV(tierId)],
      senderKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    return await broadcastTransaction(transaction, network);
  } catch (error) {
    throw new Error(`Failed to deactivate subscription tier: ${error.message}`);
  }
};

/**
 * Set platform fee on the subscription contract
 * @param {number} newFee - New fee in basis points
 * @param {string} senderKey - Admin private key
 * @returns {Promise<Object>} Broadcast response
 */
const setSubscriptionPlatformFee = async (newFee, senderKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'set-platform-fee',
      functionArgs: [uintCV(newFee)],
      senderKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    return await broadcastTransaction(transaction, network);
  } catch (error) {
    throw new Error(`Failed to set subscription platform fee: ${error.message}`);
  }
};

/**
 * Get subscription tier info from chain
 * @param {string} creatorPrincipal
 * @param {number} tierId
 * @returns {Promise<Object|null>} Tier info or null
 */
const getSubscriptionTierInfo = async (creatorPrincipal, tierId) => {
  try {
    const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
    const result = await callReadOnlyFunction({
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'get-tier-info',
      functionArgs: [principalCV(creatorPrincipal), uintCV(tierId)],
      network,
      senderAddress: process.env.CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    return data.value || null;
  } catch (error) {
    throw new Error(`Failed to get subscription tier info: ${error.message}`);
  }
};

/**
 * Verify active subscription on-chain
 * @param {string} userAddress
 * @param {string} creatorAddress
 * @param {number} tierId
 * @returns {Promise<boolean>} Whether subscription is active
 */
const verifySubscription = async (userAddress, creatorAddress, tierId) => {
  try {
    const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
    const result = await callReadOnlyFunction({
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'is-subscribed',
      functionArgs: [principalCV(userAddress), principalCV(creatorAddress), uintCV(tierId)],
      network,
      senderAddress: userAddress,
    });

    return cvToJSON(result).value;
  } catch (error) {
    throw new Error(`Failed to verify subscription: ${error.message}`);
  }
};

module.exports = {
  addContentToContract,
  removeContentFromContract,
  pauseContract,
  unpauseContract,
  getContractPaused,
  updateContentPrice,
  issueRentalLicense,
  revokeRentalLicense,
  hasValidRentalLicense,
  getPlatformFee,
  calculatePlatformFee,
  createSubscriptionTier,
  subscribeToTier,
  renewSubscription,
  updateSubscriptionTier,
  deactivateSubscriptionTier,
  setSubscriptionPlatformFee,
  getSubscriptionTierInfo,
  verifySubscription,
};

