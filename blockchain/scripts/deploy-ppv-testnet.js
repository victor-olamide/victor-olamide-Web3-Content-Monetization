#!/usr/bin/env node

/**
 * Deploy Pay-Per-View Contract to Stacks Testnet
 * 
 * This script deploys the pay-per-view.clar contract to the Stacks testnet.
 * It handles:
 * - Loading contract source code
 * - Creating contract deployment transaction
 * - Broadcasting to testnet
 * - Confirming deployment
 * - Saving contract address and deployment info
 * 
 * Usage: node deploy-ppv-testnet.js
 * Environment variables:
 *   - STACKS_PRIVATE_KEY: Private key for deployment account
 *   - STACKS_NETWORK: 'testnet' or 'mainnet'
 *   - STACKS_API_URL: Optional custom API URL
 */

const fs = require('fs');
const path = require('path');
const {
  StacksMainnet,
  StacksTestnet,
} = require('@stacks/network');
const {
  makeContractDeploy,
  broadcastTransaction,
  standardPrincipalCV,
  uintCV,
} = require('@stacks/transactions');
const axios = require('axios');

// Configuration
const NETWORK = process.env.STACKS_NETWORK || 'testnet';
const network = NETWORK === 'mainnet'
  ? new StacksMainnet()
  : new StacksTestnet();

const STACKS_API_URL = process.env.STACKS_API_URL || (
  NETWORK === 'mainnet'
    ? 'https://stacks-node-api.mainnet.stacks.co'
    : 'https://stacks-node-api.testnet.stacks.co'
);

const PRIVATE_KEY = process.env.STACKS_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('Error: STACKS_PRIVATE_KEY environment variable is not set');
  process.exit(1);
}

const CONTRACT_NAME = 'pay-per-view';
const CONTRACT_PATH = path.join(__dirname, '../contracts/pay-per-view.clar');
const DEPLOYMENT_INFO_PATH = path.join(__dirname, '../deployments/ppv-testnet-deployment.json');

/**
 * Read contract source code
 */
function readContractSource() {
  try {
    return fs.readFileSync(CONTRACT_PATH, 'utf-8');
  } catch (error) {
    console.error(`Failed to read contract from ${CONTRACT_PATH}:`, error.message);
    process.exit(1);
  }
}

/**
 * Poll for transaction confirmation
 */
async function pollForConfirmation(txId, maxAttempts = 60) {
  console.log(`\nPolling for transaction confirmation (${maxAttempts} attempts)...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(`${STACKS_API_URL}/extended/v1/tx/${txId}`);
      const status = response.data.tx_status;
      
      console.log(`[${attempt}/${maxAttempts}] Transaction status: ${status}`);
      
      if (status === 'success') {
        console.log('✓ Transaction confirmed!');
        return {
          confirmed: true,
          blockHeight: response.data.block_height,
          confirmations: response.data.confirmations || 0,
          contractId: `${response.data.sender_address}.${CONTRACT_NAME}`,
        };
      }
      
      if (status === 'abort_by_response' || status === 'abort_by_post_condition') {
        console.error('✗ Transaction failed');
        return { confirmed: false, error: status };
      }
      
      // Wait before polling again (exponential backoff up to 10 seconds)
      const delayMs = Math.min(1000 * Math.pow(1.2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (error) {
      if (error.response?.status === 404) {
        // Transaction not yet in mempool
        const delayMs = Math.min(1000 * Math.pow(1.2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('Error polling for confirmation:', error.message);
      }
    }
  }
  
  console.log('✗ Confirmation polling timeout');
  return { confirmed: false, error: 'Timeout waiting for confirmation' };
}

/**
 * Deploy the contract
 */
async function deployContract() {
  console.log('🚀 Deploying Pay-Per-View Contract to', NETWORK);
  console.log('Network:', NETWORK);
  console.log('API URL:', STACKS_API_URL);
  console.log('');

  const contractSource = readContractSource();
  console.log('✓ Contract source loaded');
  
  try {
    // Create transaction
    const txOptions = {
      contractName: CONTRACT_NAME,
      codeBody: contractSource,
      senderKey: PRIVATE_KEY,
      network,
      fee: BigInt(10000), // 0.0001 STX
    };

    console.log('Creating contract deployment transaction...');
    const tx = await makeContractDeploy(txOptions);
    
    console.log('✓ Transaction created');
    console.log('  TX ID:', tx.txid);
    console.log('');

    // Broadcast transaction
    console.log('Broadcasting transaction to', NETWORK + '...');
    const response = await broadcastTransaction(tx, network);
    
    if (response.error) {
      console.error('✗ Broadcast failed:', response.error);
      process.exit(1);
    }

    console.log('✓ Transaction broadcasted');
    console.log('  TX ID:', response.txid);
    console.log('');

    // Poll for confirmation
    const confirmationResult = await pollForConfirmation(response.txid);

    if (!confirmationResult.confirmed) {
      console.error('✗ Deployment failed:', confirmationResult.error);
      process.exit(1);
    }

    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: NETWORK,
      contractName: CONTRACT_NAME,
      contractId: confirmationResult.contractId,
      transactionId: response.txid,
      blockHeight: confirmationResult.blockHeight,
      confirmations: confirmationResult.confirmations,
      apiUrl: STACKS_API_URL,
    };

    fs.writeFileSync(
      DEPLOYMENT_INFO_PATH,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✓ Deployment info saved to:', DEPLOYMENT_INFO_PATH);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Contract deployed successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Contract ID:', confirmationResult.contractId);
    console.log('Transaction ID:', response.txid);
    console.log('Block Height:', confirmationResult.blockHeight);
    console.log('');
    console.log('Next steps:');
    console.log('1. Set PAY_PER_VIEW_ADDRESS environment variable to the sender address');
    console.log('2. Update .env with contract address');
    console.log('3. Test the integration with integration tests');

  } catch (error) {
    console.error('✗ Deployment error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run deployment
deployContract();
