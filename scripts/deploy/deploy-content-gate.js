const { deployContract } = require('./utils');

deployContract('content-gate')
  .then(txid => console.log(`TXID: ${txid}`))
  .catch(err => console.error(err));
