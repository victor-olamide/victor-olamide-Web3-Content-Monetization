const { deployContract } = require('./utils');

deployContract('mock-nft')
  .then(txid => console.log(`TXID: ${txid}`))
  .catch(err => console.error(err));
