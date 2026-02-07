const { deployContract } = require('./utils');

async function deployPayPerView() {
  console.log('Deploying pay-per-view contract...');
  const txid = await deployContract('pay-per-view');
  console.log(`TXID: ${txid}`);
  console.log('\nIMPORTANT: After deployment, configure platform wallet using:');
  console.log('  clarinet console');
  console.log('  (contract-call? .pay-per-view set-platform-wallet <wallet-address>)');
  return txid;
}

deployPayPerView()
  .catch(err => console.error(err));
