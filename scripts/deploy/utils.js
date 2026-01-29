const fs = require('fs');
const path = require('path');
const {
  makeContractDeploy,
  broadcastTransaction,
  anchorModeToNumber,
  AnchorMode,
} = require('@stacks/transactions');
const config = require('./config');

const getContractSource = (contractName) => {
  const filePath = path.join(__dirname, '../../contracts', `${contractName}.clar`);
  return fs.readFileSync(filePath, 'utf8');
};

const deployContract = async (contractName) => {
  console.log(`Deploying ${contractName}...`);
  const codeBody = getContractSource(contractName);
  
  const txOptions = {
    contractName,
    codeBody,
    senderKey: config.deployerKey,
    network: config.network,
    anchorMode: AnchorMode.Any,
    fee: config.fee,
  };

  const transaction = await makeContractDeploy(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, config.network);

  if (broadcastResponse.error) {
    throw new Error(`Error broadcasting ${contractName}: ${broadcastResponse.error} ${broadcastResponse.reason}`);
  }

  console.log(`${contractName} broadcasted. TXID: ${broadcastResponse.txid}`);
  return broadcastResponse.txid;
};

const getTxStatus = async (txid) => {
  const url = `${config.network.coreApiUrl}/extended/v1/tx/${txid}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.tx_status;
};

const verifyContract = async (contractAddress, contractName) => {
  console.log(`Verifying ${contractAddress}.${contractName}...`);
  // This is a placeholder for actual verification logic if using a specific API
  // Usually verification on Stacks Explorer happens automatically if source is public
  // or via specific API calls to explorer backends.
  console.log(`Contract ${contractName} is live at ${contractAddress}.${contractName}`);
  return true;
};

module.exports = {
  getContractSource,
  deployContract,
  getTxStatus,
  verifyContract,
};
