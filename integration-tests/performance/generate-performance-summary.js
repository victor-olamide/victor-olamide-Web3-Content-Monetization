#!/usr/bin/env node

/**
 * Performance Summary Generator
 * Aggregates load test results into a comprehensive performance summary
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'test-results');
const SUMMARY_FILE = path.join(RESULTS_DIR, 'performance-summary.json');

/**
 * Generate comprehensive performance summary
 */
function generatePerformanceSummary() {
  console.log('Generating performance summary...');

  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'concurrent-users-load-test',
    results: {},
    baselines: {},
    analysis: {}
  };

  // Process Artillery results
  const artilleryResults = path.join(RESULTS_DIR, 'concurrent-users-artillery-results.json');
  if (fs.existsSync(artilleryResults)) {
    try {
      const artilleryData = JSON.parse(fs.readFileSync(artilleryResults, 'utf8'));
      summary.results.artillery = extractArtilleryMetrics(artilleryData);
      console.log('✓ Processed Artillery results');
    } catch (error) {
      console.error('Failed to process Artillery results:', error.message);
    }
  }

  // Process Locust results (CSV format)
  const locustResults = path.join(RESULTS_DIR, 'concurrent-users-locust-results.csv');
  if (fs.existsSync(locustResults)) {
    try {
      summary.results.locust = parseLocustCSV(locustResults);
      console.log('✓ Processed Locust results');
    } catch (error) {
      console.error('Failed to process Locust results:', error.message);
    }
  }

  // Load baseline data
  const baselineFile = path.join(RESULTS_DIR, 'baseline.json');
  if (fs.existsSync(baselineFile)) {
    try {
      summary.baselines = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
      console.log('✓ Loaded baseline data');
    } catch (error) {
      console.error('Failed to load baseline:', error.message);
    }
  }

  // Generate analysis
  summary.analysis = analyzePerformance(summary.results, summary.baselines);

  // Write summary
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(`✓ Performance summary saved: ${SUMMARY_FILE}`);

  return summary;
}

/**
 * Extract key metrics from Artillery results
 */
function extractArtilleryMetrics(data) {
  const aggregate = data.aggregate || {};
  const latency = aggregate.latency || {};
  const summary = aggregate.summary || {};

  return {
    timestamp: data.timestamp || new Date().toISOString(),
    duration: aggregate.duration || 0,
    scenariosCreated: aggregate.scenariosCreated || 0,
    scenariosCompleted: aggregate.scenariosCompleted || 0,
    requestsCompleted: aggregate.requestsCompleted || 0,
    latency: {
      min: latency.min || 0,
      max: latency.max || 0,
      median: latency.median || 0,
      p95: latency.p95 || 0,
      p99: latency.p99 || 0
    },
    rps: {
      mean: summary.rps?.mean || 0,
      count: summary.rps?.count || 0
    },
    codes: aggregate.codes || {},
    errors: aggregate.errors || []
  };
}

/**
 * Parse Locust CSV results
 */
function parseLocustCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) return null;

  const headers = lines[0].split(',');
  const data = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    return row;
  });

  // Aggregate metrics
  const metrics = {
    totalRequests: 0,
    totalFailures: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerSecond: 0
  };

  data.forEach(row => {
    metrics.totalRequests += parseInt(row['# requests']) || 0;
    metrics.totalFailures += parseInt(row['# failures']) || 0;
    metrics.avgResponseTime = Math.max(metrics.avgResponseTime, parseFloat(row['Average response time']) || 0);
    metrics.minResponseTime = Math.min(metrics.minResponseTime, parseFloat(row['Min response time']) || 0);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, parseFloat(row['Max response time']) || 0);
    metrics.requestsPerSecond = Math.max(metrics.requestsPerSecond, parseFloat(row['Requests/s']) || 0);
  });

  return {
    timestamp: new Date().toISOString(),
    metrics: metrics,
    rawData: data
  };
}

/**
 * Analyze performance against baselines
 */
function analyzePerformance(results, baselines) {
  const analysis = {
    overall: 'unknown',
    recommendations: [],
    regressions: [],
    improvements: []
  };

  if (!baselines.metrics) {
    analysis.overall = 'baseline-established';
    analysis.recommendations.push('Baseline established. Run tests again to detect regressions.');
    return analysis;
  }

  // Analyze Artillery results
  if (results.artillery) {
    const artillery = results.artillery;
    const baseline = baselines.metrics;

    // Check P95 latency regression
    if (artillery.latency.p95 > baseline.p95Latency * 1.1) {
      analysis.regressions.push({
        metric: 'p95Latency',
        current: artillery.latency.p95,
        baseline: baseline.p95Latency,
        change: ((artillery.latency.p95 - baseline.p95Latency) / baseline.p95Latency * 100).toFixed(1) + '%'
      });
    } else if (artillery.latency.p95 < baseline.p95Latency * 0.9) {
      analysis.improvements.push({
        metric: 'p95Latency',
        current: artillery.latency.p95,
        baseline: baseline.p95Latency,
        change: ((baseline.p95Latency - artillery.latency.p95) / baseline.p95Latency * 100).toFixed(1) + '%'
      });
    }

    // Check throughput
    if (artillery.rps.mean < baseline.throughput * 0.9) {
      analysis.regressions.push({
        metric: 'throughput',
        current: artillery.rps.mean,
        baseline: baseline.throughput,
        change: ((baseline.throughput - artillery.rps.mean) / baseline.throughput * 100).toFixed(1) + '%'
      });
    }

    // Check error rate
    if (artillery.errors && artillery.errors.length > 0) {
      analysis.regressions.push({
        metric: 'errors',
        current: artillery.errors.length,
        baseline: 0,
        change: `${artillery.errors.length} errors detected`
      });
    }
  }

  // Determine overall status
  if (analysis.regressions.length > 0) {
    analysis.overall = 'failed';
    analysis.recommendations.push('Performance regressions detected. Review and optimize.');
  } else if (analysis.improvements.length > 0) {
    analysis.overall = 'improved';
    analysis.recommendations.push('Performance improvements detected. Consider updating baselines.');
  } else {
    analysis.overall = 'stable';
    analysis.recommendations.push('Performance is stable within acceptable ranges.');
  }

  return analysis;
}

/**
 * Print summary report
 */
function printSummaryReport(summary) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE SUMMARY REPORT');
  console.log('='.repeat(80) + '\n');

  console.log(`Test Type: ${summary.testType}`);
  console.log(`Timestamp: ${summary.timestamp}\n`);

  // Results summary
  if (summary.results.artillery) {
    const art = summary.results.artillery;
    console.log('Artillery Results:');
    console.log(`  • Duration: ${art.duration}ms`);
    console.log(`  • Requests: ${art.requestsCompleted}`);
    console.log(`  • RPS: ${art.rps.mean.toFixed(2)}`);
    console.log(`  • P95 Latency: ${art.latency.p95}ms`);
    console.log(`  • Error Rate: ${((art.errors?.length || 0) / art.requestsCompleted * 100).toFixed(2)}%\n`);
  }

  // Analysis
  console.log('Analysis:');
  console.log(`  • Overall Status: ${summary.analysis.overall.toUpperCase()}`);

  if (summary.analysis.regressions.length > 0) {
    console.log('  • Regressions:');
    summary.analysis.regressions.forEach(reg => {
      console.log(`    - ${reg.metric}: ${reg.change} (${reg.current} vs ${reg.baseline})`);
    });
  }

  if (summary.analysis.improvements.length > 0) {
    console.log('  • Improvements:');
    summary.analysis.improvements.forEach(imp => {
      console.log(`    + ${imp.metric}: ${imp.change} (${imp.current} vs ${imp.baseline})`);
    });
  }

  console.log('\nRecommendations:');
  summary.analysis.recommendations.forEach(rec => {
    console.log(`  • ${rec}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

// Main execution
if (require.main === module) {
  try {
    const summary = generatePerformanceSummary();
    printSummaryReport(summary);
  } catch (error) {
    console.error('Failed to generate performance summary:', error.message);
    process.exit(1);
  }
}

module.exports = { generatePerformanceSummary, printSummaryReport };