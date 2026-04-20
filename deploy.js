// Web3 Content Monetization — Mainnet Deployment Script
// Deploys 5 contracts in dependency order
// Usage: node deploy.js  (run from project root)
// Requires: DEPLOYER_MNEMONIC, DEPLOYER_ADDRESS, STACKS_NODE_URL in environment or .env file

const path  = require('path');
const fs    = require('fs');

require('dotenv').config();

// Use @stacks packages from the DEBY/stacks project which has wallet-sdk
const STACKS_MODULES = '/Users/mac/Documents/DEBY/stacks/node_modules';

const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} = require(path.join(STACKS_MODULES, '@stacks/transactions'));

const { STACKS_MAINNET } = require(path.join(STACKS_MODULES, '@stacks/network'));
const { generateWallet } = require(path.join(STACKS_MODULES, '@stacks/wallet-sdk'));

const MNEMONIC        = 'run ice main distance mass family dust section breeze grab sign diary umbrella then doctor exclude uncover love discover scrap robust crazy click type';
const DEPLOYER        = 'SPG2T28R84NNF0AB8PFQRSGY16CD76KV72YHPADH';
const NODE_URL        = 'https://api.mainnet.hiro.so';
const NETWORK         = { ...STACKS_MAINNET, coreApiUrl: NODE_URL };
const CONTRACTS_DIR   = path.join(__dirname, 'contracts');

const CONTRACTS = [
  { name: 'content-gate',  file: 'content-gate.clar',  fee: BigInt(3000) },
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    await sleep(3000 * (i + 1));
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function getNonce() {
  const res  = await fetchWithRetry(`${NODE_URL}/extended/v1/address/${DEPLOYER}/nonces`);
  const data = await res.json();
  return BigInt(data.possible_next_nonce);
}

async function checkTx(txId) {
  for (let i = 0; i < 60; i++) {
    await sleep(10000);
    const res  = await fetchWithRetry(`${NODE_URL}/extended/v1/tx/${txId}`);
    const data = await res.json();
    if (data.tx_status === 'success') return true;
    if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
      console.error(`  ✗ tx aborted: ${data.tx_status}`);
      return false;
    }
    process.stdout.write('.');
  }
  console.log('\n  ⚠ timed out waiting for confirmation');
  return false;
}

async function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('  Web3 Content Monetization — Mainnet Deployment');
  console.log(`  Deployer: ${DEPLOYER}`);
  console.log('════════════════════════════════════════════════════\n');

  // Derive private key from mnemonic
  console.log('Deriving private key from mnemonic...');
  const wallet     = await generateWallet({ secretKey: MNEMONIC, password: '' });
  const account    = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  console.log(`  Derived address: ${account.address || '(check explorer)'}\n`);

  let nonce = await getNonce();
  console.log(`  Starting nonce: ${nonce}\n`);

  let deployed = 0;

  for (const contract of CONTRACTS) {
    const codeBody = fs.readFileSync(path.join(CONTRACTS_DIR, contract.file), 'utf8');

    console.log(`Deploying ${contract.name}... (nonce: ${nonce}, fee: ${contract.fee} µSTX)`);

    let txId;
    try {
      const tx = await makeContractDeploy({
        contractName: contract.name,
        codeBody,
        senderKey:    privateKey,
        network:      NETWORK,
        nonce,
        fee:          contract.fee,
        anchorMode:   AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
      });

      // v7: tx.serialize() returns a hex string — convert to bytes before broadcasting
      const txHex   = tx.serialize();
      const txBytes = Buffer.from(txHex, 'hex');
      const rawRes  = await fetch(`${NODE_URL}/v2/transactions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body:    txBytes,
      });
      const rawText = await rawRes.text();
      let parsed;
      try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }
      // API returns the txid as a plain JSON string on success, or an object with error on failure
      let result;
      if (typeof parsed === 'string') {
        result = { txid: parsed };             // success: bare txid string
      } else if (parsed && parsed.txid) {
        result = parsed;                       // success: object with txid
      } else {
        result = { error: rawText };           // failure
      }
      if (!rawRes.ok) result.error = rawText;

      if (result.error) {
        console.error(`  ✗ broadcast failed: ${result.reason || result.error}`);
        process.exit(1);
      }

      txId = result.txid;
      console.log(`  Broadcast: 0x${txId}`);
    } catch (err) {
      console.error(`  ✗ error: ${err.message}`);
      process.exit(1);
    }

    process.stdout.write('  Confirming');
    const ok = await checkTx(txId);
    if (!ok) process.exit(1);
    console.log(` ✓`);
    console.log(`  https://explorer.hiro.so/txid/0x${txId}?chain=mainnet\n`);

    nonce++;
    deployed++;
    await sleep(2000);
  }

  console.log('════════════════════════════════════════════════════');
  console.log(`  ${deployed}/${CONTRACTS.length} contracts deployed successfully`);
  console.log(`  https://explorer.hiro.so/address/${DEPLOYER}?chain=mainnet`);
  console.log('════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
