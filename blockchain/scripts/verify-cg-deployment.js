#!/usr/bin/env node

/**
 * Content-Gate Deployment Verification Script
 * 
 * Performs comprehensive verification of content-gate deployment:
 * - Environment configuration
 * - Contract source code
 * - Blockchain connectivity
 * - Database connectivity
 * - Service initialization
 * - API endpoint availability
 * 
 * Usage: node verify-cg-deployment.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const { callReadOnlyFunction, cvToJSON, uintCV } = require('@stacks/transactions');
require('dotenv').config();

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

// Verification results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

/**
 * Check environment variables
 */
async function verifyEnvironment() {
  log(colors.blue, '\n📋 Verifying Environment Configuration...');

  const requiredVars = [
    'STACKS_NETWORK',
    'STACKS_API_URL',
  ];

  const optionalVars = [
    'STACKS_PRIVATE_KEY',
    'CONTENT_GATE_ADDRESS',
    'CONTENT_GATE_CONTRACT',
    'MONGODB_URI',
  ];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      log(colors.red, `✗ Missing required variable: ${varName}`);
      results.failed.push(`Environment: ${varName} not set`);
    } else {
      log(colors.green, `✓ ${varName}: ${process.env[varName]}`);
      results.passed.push(`Environment: ${varName} configured`);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      log(colors.yellow, `⚠ Optional variable not set: ${varName}`);
      results.warnings.push(`Optional: ${varName} not set`);
    } else {
      log(colors.green, `✓ ${varName}: ${process.env[varName]}`);
      results.passed.push(`Environment: ${varName} configured`);
    }
  }
}

/**
 * Check contract source file
 */
async function verifyContractSource() {
  log(colors.blue, '\n📄 Verifying Contract Source...');

  const contractPath = path.join(__dirname, '../contracts/content-gate.clar');

  if (!fs.existsSync(contractPath)) {
    log(colors.red, `✗ Contract file not found: ${contractPath}`);
    results.failed.push('Contract: File not found');
    return;
  }

  try {
    const source = fs.readFileSync(contractPath, 'utf-8');
    
    if (source.length === 0) {
      log(colors.red, '✗ Contract file is empty');
      results.failed.push('Contract: Empty source file');
      return;
    }

    log(colors.green, `✓ Contract file found (${source.length} bytes)`);
    results.passed.push('Contract: File readable');

    // Check for key functions
    const requiredFunctions = [
      'set-gating-rule',
      'delete-gating-rule',
      'verify-access',
      'verify-nft-access',
      'get-gating-rule',
    ];

    for (const func of requiredFunctions) {
      if (source.includes(`(define-public (${func}`)) {
        log(colors.green, `✓ Function found: ${func}`);
        results.passed.push(`Contract: Function ${func} present`);
      } else {
        log(colors.yellow, `⚠ Function not found: ${func}`);
        results.warnings.push(`Contract: Function ${func} missing`);
      }
    }
  } catch (error) {
    log(colors.red, `✗ Error reading contract: ${error.message}`);
    results.failed.push(`Contract: Read error - ${error.message}`);
  }
}

/**
 * Check blockchain connectivity
 */
async function verifyBlockchain() {
  log(colors.blue, '\n⛓️  Verifying Blockchain Connectivity...');

  const apiUrl = process.env.STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co';
  const network = process.env.STACKS_NETWORK === 'mainnet'
    ? new StacksMainnet()
    : new StacksTestnet();

  try {
    // Test API connectivity
    const response = await axios.get(`${apiUrl}/extended/v1/status`, { timeout: 10000 });
    
    if (response.status === 200) {
      log(colors.green, `✓ Blockchain API accessible: ${apiUrl}`);
      results.passed.push('Blockchain: API reachable');

      // Check network status
      const status = response.data;
      log(colors.green, `✓ Network status: Server hash ${status.server_version}`);
      results.passed.push('Blockchain: Status endpoint working');
    }
  } catch (error) {
    log(colors.red, `✗ Blockchain API unreachable: ${error.message}`);
    results.failed.push(`Blockchain: API error - ${error.message}`);
  }

  // Test contract deployment info file
  const deploymentPath = path.join(__dirname, '../deployments/cg-testnet-deployment.json');
  if (fs.existsSync(deploymentPath)) {
    try {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      log(colors.green, `✓ Deployment info found: ${deploymentInfo.contractId}`);
      results.passed.push('Deployment: Info file exists');
    } catch (error) {
      log(colors.yellow, `⚠ Deployment info file is invalid: ${error.message}`);
      results.warnings.push('Deployment: Invalid JSON');
    }
  } else {
    log(colors.yellow, '⚠ Deployment info not found (contract not deployed yet)');
    results.warnings.push('Deployment: Info file missing');
  }
}

/**
 * Check database connectivity
 */
async function verifyDatabase() {
  log(colors.blue, '\n🗄️  Verifying Database Connectivity...');

  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/content-monetization';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    log(colors.green, `✓ Database connected: ${mongoUri}`);
    results.passed.push('Database: Connected');

    // Check if GatingRule model exists
    try {
      const GatingRule = require('../../backend/models/GatingRule');
      log(colors.green, '✓ GatingRule model available');
      results.passed.push('Database: Model accessible');
    } catch (error) {
      log(colors.yellow, `⚠ GatingRule model error: ${error.message}`);
      results.warnings.push('Database: Model load warning');
    }

    await mongoose.disconnect();
  } catch (error) {
    log(colors.red, `✗ Database connection failed: ${error.message}`);
    results.failed.push(`Database: Connection error - ${error.message}`);
  }
}

/**
 * Check service files
 */
async function verifyServices() {
  log(colors.blue, '\n🔧 Verifying Service Files...');

  const services = [
    '../backend/services/contentGateService.js',
    '../backend/services/contentGateTransactionIndexer.js',
    '../backend/middleware/contentGateVerificationMiddleware.js',
    '../backend/routes/gatingRoutes.js',
  ];

  for (const servicePath of services) {
    const fullPath = path.join(__dirname, servicePath);
    if (fs.existsSync(fullPath)) {
      log(colors.green, `✓ Service file found: ${path.basename(fullPath)}`);
      results.passed.push(`Service: ${path.basename(fullPath)} present`);
    } else {
      log(colors.red, `✗ Service file missing: ${path.basename(fullPath)}`);
      results.failed.push(`Service: ${path.basename(fullPath)} not found`);
    }
  }
}

/**
 * Check backend server configuration
 */
async function verifyServerConfig() {
  log(colors.blue, '\n🖥️  Verifying Server Configuration...');

  const serverPath = path.join(__dirname, '../backend/server.js');

  try {
    const serverCode = fs.readFileSync(serverPath, 'utf-8');

    const checks = [
      { pattern: 'contentGateIndexer', name: 'Content-gate indexer import' },
      { pattern: 'gatingRoutes', name: 'Gating routes registration' },
      { pattern: '/api/gating', name: 'Gating API path' },
    ];

    for (const check of checks) {
      if (serverCode.includes(check.pattern)) {
        log(colors.green, `✓ ${check.name} configured`);
        results.passed.push(`Server: ${check.name}`);
      } else {
        log(colors.yellow, `⚠ ${check.name} not found`);
        results.warnings.push(`Server: ${check.name} missing`);
      }
    }
  } catch (error) {
    log(colors.red, `✗ Server configuration error: ${error.message}`);
    results.failed.push(`Server: Config read error`);
  }
}

/**
 * Print verification summary
 */
function printSummary() {
  log(colors.blue, '\n═══════════════════════════════════════════════════════════');
  log(colors.blue, 'VERIFICATION SUMMARY');
  log(colors.blue, '═══════════════════════════════════════════════════════════');

  log(colors.green, `\n✓ Passed: ${results.passed.length}`);
  results.passed.forEach(r => log(colors.green, `  • ${r}`));

  if (results.warnings.length > 0) {
    log(colors.yellow, `\n⚠ Warnings: ${results.warnings.length}`);
    results.warnings.forEach(r => log(colors.yellow, `  • ${r}`));
  }

  if (results.failed.length > 0) {
    log(colors.red, `\n✗ Failed: ${results.failed.length}`);
    results.failed.forEach(r => log(colors.red, `  • ${r}`));
  }

  log(colors.blue, '\n═══════════════════════════════════════════════════════════');

  if (results.failed.length === 0) {
    log(colors.green, '\n✓ All critical checks passed!');
    log(colors.green, '\nNext steps:');
    log(colors.green, '1. Deploy contract: node blockchain/scripts/deploy-cg-testnet.js');
    log(colors.green, '2. Update CONTENT_GATE_ADDRESS in .env');
    log(colors.green, '3. Start backend: node backend/server.js');
    log(colors.green, '4. Run tests: npm run test:cg-integration');
    process.exit(0);
  } else {
    log(colors.red, '\n✗ Some checks failed. Please review above.');
    process.exit(1);
  }
}

/**
 * Run all verifications
 */
async function runVerifications() {
  console.clear();
  log(colors.blue, '╔═══════════════════════════════════════════════════════════╗');
  log(colors.blue, '║  Content-Gate Deployment Verification                     ║');
  log(colors.blue, '╚═══════════════════════════════════════════════════════════╝');

  try {
    await verifyEnvironment();
    await verifyContractSource();
    await verifyBlockchain();
    await verifyDatabase();
    await verifyServices();
    await verifyServerConfig();
    printSummary();
  } catch (error) {
    log(colors.red, `\n✗ Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runVerifications();
}

module.exports = {
  verifyEnvironment,
  verifyContractSource,
  verifyBlockchain,
  verifyDatabase,
  verifyServices,
  verifyServerConfig,
};
