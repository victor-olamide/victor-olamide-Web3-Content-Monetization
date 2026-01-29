const { deployContract } = require('./utils');

deployContract('subscription')
  .then(txid => console.log(`TXID: ${txid}`))
  .catch(err => console.error(err));
