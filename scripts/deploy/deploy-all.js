const { deployContract } = require('./utils');

const contracts = [
  'sip-010-trait',
  'sip-009-trait',
  'mock-token',
  'mock-nft',
  'pay-per-view',
  'subscription',
  'content-gate',
];

const deployAll = async () => {
  console.log('Starting full deployment...');
  
  for (const contractName of contracts) {
    try {
      const txid = await deployContract(contractName);
      console.log(`Successfully queued ${contractName}. TXID: ${txid}`);
      
      // Optional: Add sleep to avoid nonce issues if broadcasting in rapid succession
      // await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to deploy ${contractName}:`, error.message);
      // Depending on requirements, might want to stop here
      // process.exit(1);
    }
  }
  
  console.log('Deployment script finished execution.');
};

deployAll();
