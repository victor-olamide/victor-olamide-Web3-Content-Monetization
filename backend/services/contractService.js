const {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  stringAsciiCV,
  AnchorMode,
  PostConditionMode,
} = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');

const network = process.env.NODE_ENV === 'production' ? new StacksMainnet() : new StacksTestnet();

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

module.exports = {
  addContentToContract,
};
