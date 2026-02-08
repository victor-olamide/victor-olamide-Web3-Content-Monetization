const {
  makeContractCall,
  broadcastTransaction,
  makeContractSTXPostCondition,
  FungibleConditionCode,
  uintCV,
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
 * Register subscription renewal on blockchain
 * @param {number} subscriptionId - Subscription ID
 * @param {number} amount - Renewal amount in STX
 * @param {string} subscriber - Subscriber principal address
 * @param {string} creator - Creator principal address
 * @param {string} privateKey - Signer private key
 * @returns {Promise<Object>} Broadcast response with transaction ID
 */
const registerSubscriptionRenewal = async (subscriptionId, amount, subscriber, creator, privateKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'register-renewal',
      functionArgs: [
        uintCV(subscriptionId),
        uintCV(amount),
        principalCV(subscriber),
        principalCV(creator)
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
    throw new Error(`Failed to register subscription renewal on blockchain: ${error.message}`);
  }
};

/**
 * Complete subscription renewal with payment
 * @param {number} subscriptionId - Subscription ID
 * @param {number} amount - Renewal payment amount in STX
 * @param {string} subscriber - Subscriber address
 * @param {string} creator - Creator address
 * @param {string} privateKey - Signer private key
 * @returns {Promise<Object>} Broadcast response with transaction ID
 */
const completeSubscriptionRenewal = async (subscriptionId, amount, subscriber, creator, privateKey) => {
  try {
    const postConditions = [
      makeContractSTXPostCondition(
        process.env.CONTRACT_ADDRESS,
        'subscription',
        FungibleConditionCode.LessEqual,
        uintCV(amount)
      )
    ];

    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'renew-subscription',
      functionArgs: [
        uintCV(subscriptionId),
        uintCV(amount),
        principalCV(subscriber),
        principalCV(creator)
      ],
      senderKey: privateKey,
      validateWithAbi: true,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    
    return broadcastResponse;
  } catch (error) {
    throw new Error(`Failed to complete subscription renewal: ${error.message}`);
  }
};

/**
 * Apply grace period for expired subscription
 * @param {number} subscriptionId - Subscription ID
 * @param {number} gracePeriodDays - Grace period duration in days
 * @param {string} subscriber - Subscriber address
 * @param {string} privateKey - Signer private key
 * @returns {Promise<Object>} Broadcast response
 */
const applySubscriptionGracePeriod = async (subscriptionId, gracePeriodDays, subscriber, privateKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'apply-grace-period',
      functionArgs: [
        uintCV(subscriptionId),
        uintCV(gracePeriodDays),
        principalCV(subscriber)
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
    throw new Error(`Failed to apply grace period: ${error.message}`);
  }
};

/**
 * Cancel subscription on blockchain
 * @param {number} subscriptionId - Subscription ID
 * @param {string} subscriber - Subscriber address
 * @param {string} privateKey - Signer private key
 * @returns {Promise<Object>} Broadcast response
 */
const cancelSubscriptionOnChain = async (subscriptionId, subscriber, privateKey) => {
  try {
    const txOptions = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'cancel-subscription',
      functionArgs: [
        uintCV(subscriptionId),
        principalCV(subscriber)
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
    throw new Error(`Failed to cancel subscription on blockchain: ${error.message}`);
  }
};

/**
 * Get subscription status from blockchain
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Subscription status
 */
const getSubscriptionStatusOnChain = async (subscriptionId) => {
  try {
    const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
    
    const result = await callReadOnlyFunction({
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'get-subscription',
      functionArgs: [uintCV(subscriptionId)],
      network,
      senderAddress: process.env.CONTRACT_ADDRESS,
    });
    
    return cvToJSON(result).value;
  } catch (error) {
    throw new Error(`Failed to get subscription status: ${error.message}`);
  }
};

/**
 * Check if subscription is in grace period
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<boolean>} Whether subscription is in grace period
 */
const isSubscriptionInGracePeriod = async (subscriptionId) => {
  try {
    const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
    
    const result = await callReadOnlyFunction({
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractName: 'subscription',
      functionName: 'is-in-grace-period',
      functionArgs: [uintCV(subscriptionId)],
      network,
      senderAddress: process.env.CONTRACT_ADDRESS,
    });
    
    return cvToJSON(result).value;
  } catch (error) {
    throw new Error(`Failed to check grace period status: ${error.message}`);
  }
};

module.exports = {
  addContentToContract,
  removeContentFromContract,
  getPlatformFee,
  calculatePlatformFee,
  registerSubscriptionRenewal,
  completeSubscriptionRenewal,
  applySubscriptionGracePeriod,
  cancelSubscriptionOnChain,
  getSubscriptionStatusOnChain,
  isSubscriptionInGracePeriod,
};

