const { StacksMainnet, StacksTestnet } = require('@stacks/network');
require('dotenv').config();

const network = process.env.STX_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

const config = {
  network,
  deployerKey: process.env.DEPLOYER_PRIVATE_KEY,
  fee: 100000, // 0.1 STX default fee
};

module.exports = config;
