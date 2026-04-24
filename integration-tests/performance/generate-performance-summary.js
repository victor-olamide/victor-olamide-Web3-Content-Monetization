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

  // Add trend analysis if history exists
  if (summary.baselines.history && summary.baselines.history.length > 1) {
    summary.trends = analyzeTrends(summary.baselines.history);
  }

  // Add recommendations based on analysis
  summary.recommendations = generateRecommendations(summary.analysis, summary.trends);

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
 * Analyze performance trends from historical data
 */
function analyzeTrends(history) {
  if (history.length < 2) return null;

  const trends = {};
  const metrics = ['p95Latency', 'throughput', 'errorRate'];

  for (const metric of metrics) {
    const values = history.map(h => h.current[metric]).filter(v => v !== undefined);
    if (values.length < 2) continue;

    const recent = values.slice(-3); // Last 3 tests
    const older = values.slice(-6, -3); // Previous 3 tests

    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;

      trends[metric] = {
        direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
        changePercent: change.toFixed(1) + '%',
        recentAverage: recentAvg.toFixed(2),
        olderAverage: olderAvg.toFixed(2),
        volatility: calculateVolatility(values)
      };
    }
  }

  return trends;
}

/**
 * Generate actionable recommendations based on analysis and trends
 */
function generateRecommendations(analysis, trends) {
  const recommendations = [];

  if (analysis.overall === 'degraded') {
    recommendations.push({
      priority: 'high',
      category: 'performance',
      action: 'Investigate critical performance regressions immediately',
      rationale: 'System performance has degraded significantly'
    });
  }

  if (trends && trends.p95Latency && trends.p95Latency.direction === 'increasing') {
    recommendations.push({
      priority: 'medium',
      category: 'latency',
      action: 'Optimize P95 latency - consider caching, database tuning, or scaling',
      rationale: `P95 latency trending upward by ${trends.p95Latency.changePercent}`
    });
  }

  if (analysis.regressions.some(r => r.metric === 'errorRate')) {
    recommendations.push({
      priority: 'high',
      category: 'reliability',
      action: 'Review error handling and system stability',
      rationale: 'Error rate has increased - check logs and error patterns'
    });
  }

  if (trends && trends.throughput && trends.throughput.direction === 'decreasing') {
    recommendations.push({
      priority: 'medium',
      category: 'capacity',
      action: 'Scale infrastructure or optimize resource usage',
      rationale: `Throughput declining by ${trends.throughput.changePercent}`
    });
  }

  if (analysis.improvements.length > 2) {
    recommendations.push({
      priority: 'low',
      category: 'optimization',
      action: 'Update performance baselines to reflect improvements',
      rationale: 'Multiple performance metrics have improved'
    });
  }

  return recommendations;
}

/**
 * Calculate volatility (coefficient of variation) for a metric
 */
function calculateVolatility(values) {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return mean !== 0 ? ((stdDev / mean) * 100).toFixed(1) + '%' : '0%';
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