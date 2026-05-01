const { deployContract } = require('./utils');

deployContract('pay-per-view')
  .then(txid => console.log(`TXID: ${txid}`))
  .catch(err => console.error(err));
