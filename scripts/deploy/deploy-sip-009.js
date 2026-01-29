const { deployContract } = require('./utils');

deployContract('sip-009-trait')
  .then(txid => console.log(`TXID: ${txid}`))
  .catch(err => console.error(err));
