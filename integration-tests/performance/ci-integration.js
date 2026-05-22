#!/usr/bin/env node

/**
 * CI/CD Integration Script for Load Testing
 * Integrates load testing into CI/CD pipelines with proper artifact handling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PERFORMANCE_DIR = __dirname;
const RESULTS_DIR = path.join(PERFORMANCE_DIR, 'test-results');
const ARTIFACTS_DIR = path.join(PERFORMANCE_DIR, 'ci-artifacts');

/**
 * Run load tests in CI environment
 */
function runLoadTestsInCI() {
  console.log('🚀 Starting Load Tests in CI Environment');
  console.log('=' .repeat(50));

  const startTime = Date.now();

  try {
    // Ensure directories exist
    ensureDirectories();

    // Set environment variables for testing
    process.env.LOAD_TEST_URL = process.env.LOAD_TEST_URL || 'http://localhost:5000';
    process.env.CI = 'true';

    // Run the load tests
    console.log('📊 Executing load tests...');
    const testCommand = `node "${path.join(PERFORMANCE_DIR, 'run-concurrent-load-tests.js')}" all`;
    execSync(testCommand, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    // Validate results
    console.log('✅ Validating test results...');
    validateResults();

    // Generate CI summary
    console.log('📈 Generating CI summary...');
    generateCISummary();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Load testing completed successfully in ${duration}s`);

    // Set outputs for GitHub Actions
    setGitHubOutputs();

    return true;

  } catch (error) {
    console.error('❌ Load testing failed:', error.message);

    // Generate failure report
    generateFailureReport(error);

    // Set failure outputs
    setGitHubOutputs(true);

    process.exit(1);
  }
}

/**
 * Ensure required directories exist
 */
function ensureDirectories() {
  [RESULTS_DIR, ARTIFACTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Validate that test results were generated correctly
 */
function validateResults() {
  const requiredFiles = [
    path.join(RESULTS_DIR, 'performance-summary.json'),
    path.join(RESULTS_DIR, 'baseline.json')
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

  if (missingFiles.length > 0) {
    throw new Error(`Missing required result files: ${missingFiles.join(', ')}`);
  }

  // Check that artifacts were created
  const artifacts = fs.readdirSync(ARTIFACTS_DIR);
  if (artifacts.length === 0) {
    throw new Error('No CI artifacts were generated');
  }

  console.log(`✓ Found ${artifacts.length} CI artifacts`);
}

/**
 * Generate a CI-friendly summary
 */
function generateCISummary() {
  const summaryPath = path.join(RESULTS_DIR, 'performance-summary.json');

  if (!fs.existsSync(summaryPath)) {
    console.warn('Performance summary not found, skipping CI summary generation');
    return;
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  const ciSummary = {
    timestamp: summary.timestamp,
    status: summary.analysis.overall,
    riskLevel: summary.analysis.riskLevel || 'unknown',
    keyMetrics: {
      p95Latency: summary.results.artillery?.latency.p95 || 'N/A',
      throughput: summary.results.artillery?.rps.mean || 'N/A',
      errorRate: summary.results.artillery ?
        ((summary.results.artillery.errors?.length || 0) / summary.results.artillery.requestsCompleted * 100).toFixed(2) + '%' : 'N/A'
    },
    issues: {
      regressions: summary.analysis.regressions?.length || 0,
      improvements: summary.analysis.improvements?.length || 0
    },
    recommendations: summary.recommendations || []
  };

  const ciSummaryPath = path.join(RESULTS_DIR, 'ci-summary.json');
  fs.writeFileSync(ciSummaryPath, JSON.stringify(ciSummary, null, 2));

  // Also create a human-readable summary
  const humanSummary = generateHumanReadableSummary(ciSummary);
  const humanSummaryPath = path.join(RESULTS_DIR, 'ci-summary.md');
  fs.writeFileSync(humanSummaryPath, humanSummary);

  console.log('✓ CI summary generated');
}

/**
 * Generate human-readable summary for PR comments
 */
function generateHumanReadableSummary(ciSummary) {
  let summary = `# 🚀 Load Testing Results\n\n`;
  summary += `**Status:** ${ciSummary.status.toUpperCase()}\n`;
  summary += `**Risk Level:** ${ciSummary.riskLevel.toUpperCase()}\n`;
  summary += `**Timestamp:** ${new Date(ciSummary.timestamp).toLocaleString()}\n\n`;

  summary += `## 📊 Key Metrics\n\n`;
  summary += `| Metric | Value |\n`;
  summary += `|--------|-------|\n`;
  summary += `| P95 Latency | ${ciSummary.keyMetrics.p95Latency}ms |\n`;
  summary += `| Throughput | ${ciSummary.keyMetrics.throughput} req/s |\n`;
  summary += `| Error Rate | ${ciSummary.keyMetrics.errorRate} |\n\n`;

  summary += `## ⚠️ Issues Detected\n\n`;
  summary += `- **Regressions:** ${ciSummary.issues.regressions}\n`;
  summary += `- **Improvements:** ${ciSummary.issues.improvements}\n\n`;

  if (ciSummary.recommendations && ciSummary.recommendations.length > 0) {
    summary += `## 💡 Recommendations\n\n`;
    ciSummary.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      summary += `${index + 1}. ${priority} **${rec.category}**: ${rec.action}\n`;
      summary += `   *${rec.rationale}*\n\n`;
    });
  }

  return summary;
}

/**
 * Generate failure report for CI
 */
function generateFailureReport(error) {
  const failureReport = {
    timestamp: new Date().toISOString(),
    status: 'failed',
    error: error.message,
    stage: 'load-testing',
    artifacts: fs.existsSync(ARTIFACTS_DIR) ? fs.readdirSync(ARTIFACTS_DIR) : []
  };

  const failurePath = path.join(RESULTS_DIR, 'failure-report.json');
  fs.writeFileSync(failurePath, JSON.stringify(failureReport, null, 2));

  console.log('✓ Failure report generated');
}

/**
 * Set GitHub Actions outputs
 */
function setGitHubOutputs(failed = false) {
  if (!process.env.GITHUB_OUTPUT) {
    console.log('Not running in GitHub Actions, skipping output setting');
    return;
  }

  const outputs = [];

  if (!failed) {
    // Success outputs
    const summaryPath = path.join(RESULTS_DIR, 'ci-summary.json');
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      outputs.push(`status=${summary.status}`);
      outputs.push(`risk-level=${summary.riskLevel}`);
      outputs.push(`p95-latency=${summary.keyMetrics.p95Latency}`);
      outputs.push(`throughput=${summary.keyMetrics.throughput}`);
      outputs.push(`regressions=${summary.issues.regressions}`);
    }

    outputs.push(`artifacts-path=${ARTIFACTS_DIR}`);
  } else {
    // Failure outputs
    outputs.push('status=failed');
    outputs.push('error=true');
  }

  // Write to GitHub output
  const outputContent = outputs.join('\n');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, outputContent + '\n');

  console.log('✓ GitHub Actions outputs set');
}

// Main execution
if (require.main === module) {
  runLoadTestsInCI();
}

module.exports = { runLoadTestsInCI, generateHumanReadableSummary };