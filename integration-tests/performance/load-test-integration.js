#!/usr/bin/env node

/**
 * Concurrent User Load Test - Integration Helper
 * Provides utilities for integrating concurrent load tests into CI/CD pipelines
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LoadTestIntegration {
  constructor(resultsDir = './test-results') {
    this.resultsDir = resultsDir;
    this.passThreshold = {
      avgLatency: 500,      // ms
      p99Latency: 2000,     // ms
      errorRate: 1.0,       // %
      throughput: 100       // req/s
    };
  }

  /**
   * Set custom pass thresholds
   */
  setThresholds(thresholds) {
    this.passThreshold = { ...this.passThreshold, ...thresholds };
  }

  /**
   * Run load test and validate results
   */
  runAndValidate(testConfig) {
    console.log('Running concurrent load test with validation...\n');

    try {
      // Run the test
      const testCommand = `node run-concurrent-load-tests.js ${testConfig.mode || 'all'}`;
      console.log(`Executing: ${testCommand}`);
      execSync(testCommand, { stdio: 'inherit', cwd: __dirname });

      // Validate results
      const results = this.validateResults();
      return results;
    } catch (error) {
      console.error(`Load test execution failed: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Validate test results against thresholds
   */
  validateResults() {
    if (!fs.existsSync(this.resultsDir)) {
      console.error(`Results directory not found: ${this.resultsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(this.resultsDir);
    const latestResult = this.getLatestJsonFile(files);

    if (!latestResult) {
      console.error('No test results found');
      process.exit(1);
    }

    const resultPath = path.join(this.resultsDir, latestResult);
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

    const validation = {
      passed: true,
      failures: [],
      metrics: {}
    };

    // Extract metrics
    const metrics = data.aggregate || {};
    const latency = metrics.latency || {};
    const summary = metrics.summary || {};

    validation.metrics = {
      avgLatency: latency.mean || 0,
      p99Latency: latency.p99 || 0,
      errorRate: this.calculateErrorRate(summary),
      throughput: summary.rps?.mean || 0
    };

    // Check against thresholds
    if (validation.metrics.avgLatency > this.passThreshold.avgLatency) {
      validation.passed = false;
      validation.failures.push(
        `Average latency ${validation.metrics.avgLatency.toFixed(2)}ms exceeds threshold ${this.passThreshold.avgLatency}ms`
      );
    }

    if (validation.metrics.p99Latency > this.passThreshold.p99Latency) {
      validation.passed = false;
      validation.failures.push(
        `P99 latency ${validation.metrics.p99Latency.toFixed(2)}ms exceeds threshold ${this.passThreshold.p99Latency}ms`
      );
    }

    if (validation.metrics.errorRate > this.passThreshold.errorRate) {
      validation.passed = false;
      validation.failures.push(
        `Error rate ${validation.metrics.errorRate.toFixed(2)}% exceeds threshold ${this.passThreshold.errorRate}%`
      );
    }

    if (validation.metrics.throughput < this.passThreshold.throughput) {
      validation.passed = false;
      validation.failures.push(
        `Throughput ${validation.metrics.throughput.toFixed(2)} req/s below threshold ${this.passThreshold.throughput} req/s`
      );
    }

    // Print results
    this.printValidationResults(validation);

    return validation;
  }

  /**
   * Calculate error rate from summary
   */
  calculateErrorRate(summary) {
    const total = summary.numCompleted || 0;
    const errors = summary.numErrors || 0;
    return total > 0 ? ((errors / total) * 100) : 0;
  }

  /**
   * Get latest JSON test result file
   */
  getLatestJsonFile(files) {
    const jsonFiles = files
      .filter(f => f.endsWith('.json') && !f.includes('metrics'))
      .sort((a, b) => {
        const pathA = path.join(this.resultsDir, a);
        const pathB = path.join(this.resultsDir, b);
        return fs.statSync(pathB).mtime - fs.statSync(pathA).mtime;
      });

    return jsonFiles[0] || null;
  }

  /**
   * Print validation results
   */
  printValidationResults(validation) {
    console.log('\n' + '='.repeat(80));
    console.log('LOAD TEST VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');

    console.log('📊 METRICS:');
    console.log(`  • Average Latency: ${validation.metrics.avgLatency.toFixed(2)}ms (threshold: ${this.passThreshold.avgLatency}ms)`);
    console.log(`  • P99 Latency: ${validation.metrics.p99Latency.toFixed(2)}ms (threshold: ${this.passThreshold.p99Latency}ms)`);
    console.log(`  • Error Rate: ${validation.metrics.errorRate.toFixed(2)}% (threshold: ${this.passThreshold.errorRate}%)`);
    console.log(`  • Throughput: ${validation.metrics.throughput.toFixed(2)} req/s (threshold: ${this.passThreshold.throughput} req/s)\n`);

    if (validation.passed) {
      console.log('✅ VALIDATION PASSED - All metrics within acceptable thresholds\n');
    } else {
      console.log('❌ VALIDATION FAILED - The following issues were detected:\n');
      for (const failure of validation.failures) {
        console.log(`  • ${failure}`);
      }
      console.log();
    }

    console.log('='.repeat(80) + '\n');

    // Exit with appropriate code
    if (!validation.passed) {
      process.exit(1);
    }
  }

  /**
   * Generate SLA report
   */
  generateSLAReport() {
    const reportPath = path.join(this.resultsDir, 'SLA-validation-report.txt');
    
    let report = 'LOAD TEST SLA VALIDATION REPORT\n';
    report += '='.repeat(80) + '\n\n';
    
    report += 'SLA Thresholds:\n';
    report += `  • Average Latency: ${this.passThreshold.avgLatency}ms\n`;
    report += `  • P99 Latency: ${this.passThreshold.p99Latency}ms\n`;
    report += `  • Error Rate: ${this.passThreshold.errorRate}%\n`;
    report += `  • Minimum Throughput: ${this.passThreshold.throughput} req/s\n\n`;
    
    report += 'These thresholds must be met for the load test to be considered successful.\n';
    
    fs.writeFileSync(reportPath, report);
    console.log(`SLA report saved to: ${reportPath}`);
  }
}

// Main execution
if (require.main === module) {
  const integration = new LoadTestIntegration(process.argv[2] || './test-results');

  // Support command line arguments for custom thresholds
  if (process.argv.includes('--avg-latency')) {
    const idx = process.argv.indexOf('--avg-latency');
    integration.passThreshold.avgLatency = parseInt(process.argv[idx + 1]);
  }

  if (process.argv.includes('--p99-latency')) {
    const idx = process.argv.indexOf('--p99-latency');
    integration.passThreshold.p99Latency = parseInt(process.argv[idx + 1]);
  }

  if (process.argv.includes('--error-rate')) {
    const idx = process.argv.indexOf('--error-rate');
    integration.passThreshold.errorRate = parseFloat(process.argv[idx + 1]);
  }

  if (process.argv.includes('--throughput')) {
    const idx = process.argv.indexOf('--throughput');
    integration.passThreshold.throughput = parseInt(process.argv[idx + 1]);
  }

  // Generate SLA report
  integration.generateSLAReport();

  // Run validation
  integration.validateResults();
}

module.exports = LoadTestIntegration;
