const { getTxStatus } = require('./utils');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node status-check.js <txid>');
  process.exit(1);
}

const txid = args[0];

getTxStatus(txid)
  .then(status => console.log(`Transaction status for ${txid}: ${status}`))
  .catch(err => console.error('Error fetching status:', err.message));
