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

module.exports = {
  addContentToContract,
  removeContentFromContract,
  getPlatformFee,
  calculatePlatformFee,
};
