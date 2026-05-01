const { deployContract } = require('./utils');

deployContract('mock-token')
  .then(txid => console.log(`TXID: ${txid}`))
  .catch(err => console.error(err));
