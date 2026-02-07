require('dotenv').config();

module.exports = {
  network: 'testnet',
  stacksApi: 'https://stacks-node-api.testnet.stacks.co',
  backendApi: process.env.BACKEND_API || 'http://localhost:5000/api',
  contractAddress: process.env.CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  testAccounts: {
    deployer: {
      address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      key: process.env.DEPLOYER_KEY
    },
    creator: {
      address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
      key: process.env.CREATOR_KEY
    },
    user1: {
      address: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
      key: process.env.USER1_KEY
    },
    user2: {
      address: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND',
      key: process.env.USER2_KEY
    }
  },
  testContent: {
    contentId: 1,
    price: 1000000,
    uri: 'ipfs://QmTest123',
    title: 'Test Content',
    description: 'Integration test content'
  },
  testSubscription: {
    tierId: 1,
    price: 5000000,
    duration: 30
  },
  timeout: 120000
};
