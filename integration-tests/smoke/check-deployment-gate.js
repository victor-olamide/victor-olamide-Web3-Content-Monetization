#!/usr/bin/env node
'use strict';

/**
 * Deployment Gate Check (#195)
 * Reads the latest smoke test JSON report and exits 1 if any
 * critical test failed, blocking the deployment pipeline.
 */

const fs   = require('fs');
const path = require('path');

const resultsDir = path.join(__dirname, '..', 'test-results');

function getLatestReport() {
  if (!fs.existsSync(resultsDir)) return null;
  const files = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('smoke-report-') && f.endsWith('.json'))
    .sort()
    .reverse();
  return files.length ? path.join(resultsDir, files[0]) : null;
}

const reportPath = getLatestReport();

if (!reportPath) {
  console.error('❌ No smoke report found. Run smoke tests first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log(`\n📋 Smoke Report: ${path.basename(reportPath)}`);
console.log(`   Environment:    ${report.environment}`);
console.log(`   Deployment URL: ${report.deployment_url}`);
console.log(`   Passed:         ${report.summary.passed}`);
console.log(`   Failed:         ${report.summary.failed}`);
console.log(`   Success Rate:   ${report.summary.success_rate}`);

if (!report.deployment_ready) {
  console.log('\n❌ DEPLOYMENT BLOCKED — critical smoke tests failed:');
  report.critical_failures.forEach(t => console.log(`   • ${t.name}: ${t.error}`));
  process.exit(1);
}

console.log('\n✅ DEPLOYMENT GATE: all critical checks passed.\n');
process.exit(0);
