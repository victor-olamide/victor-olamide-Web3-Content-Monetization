const { 
  makeContractCall, 
  broadcastTransaction,
  callReadOnlyFunction,
  uintCV, 
  standardPrincipalCV,
  stringAsciiCV,
  cvToJSON,
  AnchorMode 
} = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const axios = require('axios');
const config = require('./config');

const network = new StacksTestnet();

async function waitForTransaction(txId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${config.stacksApi}/extended/v1/tx/${txId}`);
      if (response.data.tx_status === 'success') {
        return true;
      }
      if (response.data.tx_status === 'abort_by_response' || response.data.tx_status === 'abort_by_post_condition') {
        throw new Error(`Transaction failed: ${response.data.tx_status}`);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Error checking transaction:', err.message);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Transaction timeout');
}

async function deployContract(contractName, contractCode, senderKey) {
  const txOptions = {
    contractName,
    codeBody: contractCode,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
  };
  
  const transaction = await makeContractCall(txOptions);
  const result = await broadcastTransaction(transaction, network);
  return result.txid;
}

async function callContract(contractName, functionName, functionArgs, senderKey) {
  const txOptions = {
    contractAddress: config.contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
  };
  
  const transaction = await makeContractCall(txOptions);
  const result = await broadcastTransaction(transaction, network);
  return result.txid;
}

async function readContract(contractName, functionName, functionArgs, senderAddress) {
  const result = await callReadOnlyFunction({
    contractAddress: config.contractAddress,
    contractName,
    functionName,
    functionArgs,
    network,
    senderAddress,
  });
  
  return cvToJSON(result);
}

async function verifyBackendAccess(userAddress, contentId) {
  const response = await axios.get(
    `${config.backendApi}/access/verify/${userAddress}/${contentId}`
  );
  return response.data;
}

async function streamContent(userAddress, contentId) {
  const response = await axios.get(
    `${config.backendApi}/delivery/${contentId}/stream`,
    {
      headers: { 'X-Stacks-Address': userAddress },
      validateStatus: () => true
    }
  );
  return response;
}

module.exports = {
  waitForTransaction,
  deployContract,
  callContract,
  readContract,
  verifyBackendAccess,
  streamContent,
  uintCV,
  standardPrincipalCV,
  stringAsciiCV
};
