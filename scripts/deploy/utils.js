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

module.exports = {
  getContractSource,
  deployContract,
};
