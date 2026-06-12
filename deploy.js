// Web3 Content Monetization — Mainnet Deployment Script
// Deploys contracts in dependency order
//
// Usage:
//   node deploy.js
//
// Config: settings/Mainnet.toml — set your mnemonic under [accounts.deployer]
// Optional env vars:
//   STACKS_NODE_URL     — Stacks API base URL (default: https://api.mainnet.hiro.so)
//   STACKS_MODULES_PATH — Path to @stacks node_modules
//   DRY_RUN             — Set to "true" to skip broadcasting transactions

const path  = require('path');
const fs    = require('fs');

// ─── Read mnemonic from settings/Mainnet.toml ─────────────────────────────────
function readMainnetToml() {
  const tomlPath = path.join(__dirname, 'settings', 'Mainnet.toml');
  if (!fs.existsSync(tomlPath)) {
    console.error('settings/Mainnet.toml not found.');
    process.exit(1);
  }
  const raw = fs.readFileSync(tomlPath, 'utf8');

  // Find the [accounts.deployer] section and extract mnemonic = "..."
  const match = raw.match(/\[accounts\.deployer\][^\[]*mnemonic\s*=\s*"([^"]+)"/s);
  if (!match) {
    console.error('Could not find mnemonic under [accounts.deployer] in settings/Mainnet.toml');
    process.exit(1);
  }
  return match[1].trim();
}

// Use @stacks packages from the DEBY/stacks project which has wallet-sdk
const STACKS_MODULES = process.env.STACKS_MODULES_PATH || '/Users/mac/Documents/DEBY/stacks/node_modules';

const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  privateKeyToPublic,
  publicKeyToAddress,
  AddressVersion,
  ClarityVersion,
} = require(path.join(STACKS_MODULES, '@stacks/transactions'));

const { STACKS_MAINNET } = require(path.join(STACKS_MODULES, '@stacks/network'));
const { generateWallet } = require(path.join(STACKS_MODULES, '@stacks/wallet-sdk'));

const MNEMONIC      = readMainnetToml();
const NODE_URL      = process.env.STACKS_NODE_URL || 'https://api.mainnet.hiro.so';
const NETWORK       = { ...STACKS_MAINNET, coreApiUrl: NODE_URL };
const CONTRACTS_DIR = path.join(__dirname, 'contracts');
const DRY_RUN       = process.env.DRY_RUN === 'true';

// DEPLOYER is set after the wallet is derived in main()
let DEPLOYER = '';

// Deploy order matters: traits → independent contracts → contracts that reference others
const CONTRACTS = [
  { name: 'sip-009-trait',      file: 'sip-009-trait.clar',      fee: BigInt(5000)  },
  { name: 'sip-010-trait',      file: 'sip-010-trait.clar',      fee: BigInt(5000)  },
  { name: 'pay-per-view',       file: 'pay-per-view.clar',       fee: BigInt(100000) },
  { name: 'subscription',       file: 'subscription.clar',       fee: BigInt(50000) },
  { name: 'web3content-nft',    file: 'web3content-nft.clar',    fee: BigInt(15000) },
  { name: 'web3content-token',  file: 'web3content-token.clar',  fee: BigInt(15000) },
  { name: 'content-gate',       file: 'content-gate.clar',       fee: BigInt(30000) },
];

function validateMnemonic(mnemonic) {
  const wordCount = mnemonic.trim().split(/\s+/).length;
  if (wordCount !== 24) {
    console.error(`Mnemonic in settings/Mainnet.toml must be a 24-word BIP-39 phrase (got ${wordCount} words)`);
    process.exit(1);
  }
}

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

async function isAlreadyDeployed(deployer, contractName) {
  try {
    const res = await fetch(`${NODE_URL}/v2/contracts/interface/${deployer}/${contractName}`);
    return res.ok;
  } catch {
    return false;
  }
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
  validateMnemonic(MNEMONIC);

  // Derive deployer address from mnemonic — do not log the mnemonic itself
  console.log('Deriving deployer address from mnemonic...');
  const wallet     = await generateWallet({ secretKey: MNEMONIC, password: '' });
  const account    = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  DEPLOYER         = publicKeyToAddress(AddressVersion.MainnetSingleSig, privateKeyToPublic(privateKey));
  console.log(`  Deployer address: ${DEPLOYER}\n`);

  console.log('════════════════════════════════════════════════════');
  console.log('  Web3 Content Monetization — Mainnet Deployment');
  console.log(`  Deployer : ${DEPLOYER}`);
  console.log(`  Node URL : ${NODE_URL}`);
  console.log(`  Dry Run  : ${DRY_RUN}`);
  console.log(`  Contracts: ${CONTRACTS.length}`);
  console.log('  Order: sip-009-trait → sip-010-trait → pay-per-view →');
  console.log('         subscription → web3content-nft → web3content-token → content-gate');
  console.log('════════════════════════════════════════════════════\n');

  let nonce = await getNonce();
  console.log(`  Starting nonce: ${nonce}\n`);

  let deployed = 0;

  for (const contract of CONTRACTS) {
    const codeBody = fs.readFileSync(path.join(CONTRACTS_DIR, contract.file), 'utf8');

    const alreadyDeployed = await isAlreadyDeployed(DEPLOYER, contract.name);
    if (alreadyDeployed) {
      console.log(`Skipping ${contract.name} — already deployed on-chain`);
      deployed++;
      continue;
    }

    console.log(`Deploying ${contract.name}... (nonce: ${nonce}, fee: ${contract.fee} µSTX)`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Skipping broadcast for ${contract.name}`);
      nonce++;
      deployed++;
      continue;
    }

    let txId;
    try {
      const tx = await makeContractDeploy({
        contractName:      contract.name,
        codeBody,
        senderKey:         privateKey,
        network:           NETWORK,
        nonce,
        fee:               contract.fee,
        anchorMode:        AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        clarityVersion:    ClarityVersion.Clarity2,
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
  console.log('\n  Next step: copy your deployer address into interact-web3content.js');
  console.log(`  CONTRACT_OWNER = '${DEPLOYER}'`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
