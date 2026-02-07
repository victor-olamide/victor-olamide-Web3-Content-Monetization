const { callReadOnlyFunction, cvToJSON, standardPrincipalCV, uintCV } = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');

const network = process.env.STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const contractAddress = process.env.CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

/**
 * Verify if user has purchased content on-chain
 */
async function verifyPurchase(userAddress, contentId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'pay-per-view',
      functionName: 'has-access',
      functionArgs: [uintCV(contentId), standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    return cvToJSON(result).value;
  } catch (err) {
    console.error('Purchase verification error:', err);
    return false;
  }
}

/**
 * Verify if user has active subscription on-chain
 */
async function verifySubscription(userAddress, creatorAddress, tierId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'subscription',
      functionName: 'is-subscribed',
      functionArgs: [
        standardPrincipalCV(userAddress),
        standardPrincipalCV(creatorAddress),
        uintCV(tierId)
      ],
      network,
      senderAddress: userAddress,
    });

    return cvToJSON(result).value;
  } catch (err) {
    console.error('Subscription verification error:', err);
    return false;
  }
}

/**
 * Get content info from on-chain contract
 */
async function getContentInfo(contentId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'pay-per-view',
      functionName: 'get-content-info',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: contractAddress,
    });

    const data = cvToJSON(result);
    return data.value ? data.value : null;
  } catch (err) {
    console.error('Content info error:', err);
    return null;
  }
}

/**
 * Verify token gating rule from on-chain
 */
async function verifyGatingRule(contentId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'content-gate',
      functionName: 'get-gating-rule',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: contractAddress,
    });

    const data = cvToJSON(result);
    return data.value ? data.value : null;
  } catch (err) {
    console.error('Gating rule error:', err);
    return null;
  }
}

module.exports = {
  verifyPurchase,
  verifySubscription,
  getContentInfo,
  verifyGatingRule
};
