#!/usr/bin/env node

/**
 * Pay-Per-View Deployment Verification Script
 * 
 * This script verifies all prerequisites and configurations are in place
 * for successful deployment of the pay-per-view contract and backend integration.
 * 
 * Usage: node verify-ppv-deployment.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const symbols = {
  check: '✓',
  cross: '✗',
  warning: '⚠',
  info: 'ℹ',
};

let checksPassedCount = 0;
let checksFailedCount = 0;

/**
 * Print colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print check result
 */
function checkResult(name, passed, details = '') {
  const symbol = passed ? symbols.check : symbols.cross;
  const color = passed ? 'green' : 'red';
  
  if (passed) {
    checksPassedCount++;
  } else {
    checksFailedCount++;
  }
  
  const status = `${symbol} ${name}`;
  if (details) {
    log(`${status} - ${details}`, color);
  } else {
    log(status, color);
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Check if environment variable is set
 */
function envExists(varName) {
  return process.env[varName] && process.env[varName].trim() !== '';
}

/**
 * Run all verification checks
 */
async function runVerification() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Pay-Per-View Deployment Verification Script          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  // ─────────────────────────────────────────────────────────────
  // 1. Environment Variables
  // ─────────────────────────────────────────────────────────────
  log('\n📋 Checking Environment Variables...', 'blue');
  
  checkResult('STACKS_NETWORK', envExists('STACKS_NETWORK'), process.env.STACKS_NETWORK);
  checkResult('STACKS_API_URL', envExists('STACKS_API_URL'), process.env.STACKS_API_URL);
  checkResult('STACKS_PRIVATE_KEY', envExists('STACKS_PRIVATE_KEY'), '(hidden)');
  checkResult('PAY_PER_VIEW_ADDRESS', envExists('PAY_PER_VIEW_ADDRESS'), process.env.PAY_PER_VIEW_ADDRESS);
  checkResult('DB_URI', envExists('DB_URI'), process.env.DB_URI);

  // ─────────────────────────────────────────────────────────────
  // 2. Contract Files
  // ─────────────────────────────────────────────────────────────
  log('\n📁 Checking Contract Files...', 'blue');
  
  checkResult(
    'pay-per-view.clar',
    fileExists('contracts/pay-per-view.clar'),
    'Primary contract'
  );
  checkResult(
    'deployment script',
    fileExists('blockchain/scripts/deploy-ppv-testnet.js'),
    'Deployment automation'
  );

  // ─────────────────────────────────────────────────────────────
  // 3. Backend Files
  // ─────────────────────────────────────────────────────────────
  log('\n🔧 Checking Backend Integration Files...', 'blue');
  
  checkResult(
    'payPerViewService.js',
    fileExists('backend/services/payPerViewService.js'),
    'Service layer'
  );
  checkResult(
    'ppvVerificationMiddleware.js',
    fileExists('backend/middleware/ppvVerificationMiddleware.js'),
    'Middleware'
  );
  checkResult(
    'purchaseRoutes.js updated',
    fileExists('backend/routes/purchaseRoutes.js'),
    'API routes'
  );

  // ─────────────────────────────────────────────────────────────
  // 4. Configuration Files
  // ─────────────────────────────────────────────────────────────
  log('\n⚙️  Checking Configuration Files...', 'blue');
  
  checkResult(
    'ppv-testnet.config.yaml',
    fileExists('deployments/ppv-testnet.config.yaml'),
    'Deployment plan'
  );
  checkResult(
    '.env.ppv.example',
    fileExists('.env.ppv.example'),
    'Environment template'
  );

  // ─────────────────────────────────────────────────────────────
  // 5. Documentation
  // ─────────────────────────────────────────────────────────────
  log('\n📚 Checking Documentation...', 'blue');
  
  checkResult(
    'PAY_PER_VIEW_INTEGRATION.md',
    fileExists('docs/PAY_PER_VIEW_INTEGRATION.md'),
    'Integration guide'
  );

  // ─────────────────────────────────────────────────────────────
  // 6. Test Files
  // ─────────────────────────────────────────────────────────────
  log('\n🧪 Checking Test Files...', 'blue');
  
  checkResult(
    'pay-per-view.test.js',
    fileExists('integration-tests/e2e/pay-per-view.test.js'),
    'Integration tests'
  );

  // ─────────────────────────────────────────────────────────────
  // 7. Dependencies
  // ─────────────────────────────────────────────────────────────
  log('\n📦 Checking Dependencies...', 'blue');
  
  try {
    require('@stacks/transactions');
    checkResult('@stacks/transactions', true);
  } catch (e) {
    checkResult('@stacks/transactions', false, 'Not installed');
  }

  try {
    require('@stacks/network');
    checkResult('@stacks/network', true);
  } catch (e) {
    checkResult('@stacks/network', false, 'Not installed');
  }

  try {
    require('mongoose');
    checkResult('mongoose', true);
  } catch (e) {
    checkResult('mongoose', false, 'Not installed');
  }

  try {
    require('axios');
    checkResult('axios', true);
  } catch (e) {
    checkResult('axios', false, 'Not installed');
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Network Connectivity (Async)
  // ─────────────────────────────────────────────────────────────
  log('\n🌐 Checking Network Connectivity...', 'blue');
  
  const stacksApiUrl = process.env.STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co';
  
  try {
    const response = await axios.get(`${stacksApiUrl}/v2/info`, { timeout: 5000 });
    checkResult(
      `Stacks API (${stacksApiUrl})`,
      response.status === 200,
      `Block height: ${response.data.stacks_tip_height}`
    );
  } catch (error) {
    checkResult(
      `Stacks API (${stacksApiUrl})`,
      false,
      error.message
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 9. Database Connection (if configured)
  // ─────────────────────────────────────────────────────────────
  if (envExists('DB_URI')) {
    log('\n🗄️  Checking Database Connection...', 'blue');
    
    try {
      const mongoose = require('mongoose');
      const dbUri = process.env.DB_URI;
      
      // Don't actually connect in verification script
      // Just check if connection string is valid
      const isValidUri = dbUri.includes('mongodb://') || dbUri.includes('mongodb+srv://');
      checkResult(
        'Database URI format',
        isValidUri,
        dbUri.split('@')[1] || 'local DB'
      );
    } catch (error) {
      checkResult('Database URI format', false, error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log(`║ Checks Passed:  ${checksPassedCount.toString().padEnd(42)} ║`, 'cyan');
  log(`║ Checks Failed:  ${checksFailedCount.toString().padEnd(42)} ║`, 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  if (checksFailedCount === 0) {
    log('✅ All checks passed! Ready for deployment.', 'green');
    log('\nNext steps:', 'green');
    log('1. Deploy contract: node blockchain/scripts/deploy-ppv-testnet.js', 'yellow');
    log('2. Update .env with deployed contract address', 'yellow');
    log('3. Run integration tests: npm run test:e2e', 'yellow');
    log('4. Start backend: npm start', 'yellow');
    process.exit(0);
  } else {
    log(`❌ ${checksFailedCount} check(s) failed. Please address above issues.`, 'red');
    log('\nCommon issues and solutions:', 'yellow');
    log('- Missing dependencies: Run "npm install" in project root and backend', 'yellow');
    log('- Missing files: Some files may not be created yet', 'yellow');
    log('- Network issues: Check Stacks API URL and internet connection', 'yellow');
    process.exit(1);
  }
}

// Run verification
runVerification().catch(error => {
  log(`\n❌ Verification error: ${error.message}`, 'red');
  process.exit(1);
});
