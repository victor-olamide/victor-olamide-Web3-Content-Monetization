/**
 * Concurrent User Load Test - Baseline Calculator
 * Establishes and tracks performance baselines over time
 */

const fs = require('fs');
const path = require('path');

class BaselineCalculator {
  constructor(resultsDir = './test-results', baselineFile = 'baseline.json') {
    this.resultsDir = resultsDir;
    this.baselineFile = path.join(resultsDir, baselineFile);
    this.baseline = this.loadBaseline();
  }

  /**
   * Load existing baseline or create default
   */
  loadBaseline() {
    if (fs.existsSync(this.baselineFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to load baseline:', error.message);
      }
    }

    return {
      created: new Date().toISOString(),
      metrics: {
        avgLatency: null,
        p95Latency: null,
        p99Latency: null,
        maxLatency: null,
        errorRate: null,
        throughput: null
      },
      history: []
    };
  }

  /**
   * Extract metrics from test results
   */
  extractMetrics(resultFile) {
    const filePath = path.join(this.resultsDir, resultFile);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Results file not found: ${filePath}`);
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const metrics = data.aggregate || {};
      const latency = metrics.latency || {};
      const summary = metrics.summary || {};

      return {
        timestamp: new Date().toISOString(),
        file: resultFile,
        metrics: {
          avgLatency: latency.mean || 0,
          p95Latency: latency.p95 || 0,
          p99Latency: latency.p99 || 0,
          maxLatency: latency.max || 0,
          errorRate: ((summary.numErrors / (summary.numCompleted || 1)) * 100) || 0,
          throughput: summary.rps?.mean || 0
        }
      };
    } catch (error) {
      console.error(`Failed to extract metrics: ${error.message}`);
      return null;
    }
  }

  /**
   * Set baseline from current test results
   */
  setBaseline(resultFile) {
    const testMetrics = this.extractMetrics(resultFile);
    
    if (!testMetrics) {
      console.error('Failed to set baseline');
      return false;
    }

    this.baseline.created = testMetrics.timestamp;
    this.baseline.metrics = testMetrics.metrics;
    this.baseline.history = this.baseline.history || [];

    this.saveBaseline();
    this.printBaseline();

    return true;
  }

  /**
   * Compare current results against baseline
   */
  compareToBaseline(resultFile) {
    const testMetrics = this.extractMetrics(resultFile);
    
    if (!testMetrics || !this.baseline.metrics.avgLatency) {
      console.log('Cannot compare: baseline not established');
      return null;
    }

    const comparison = {
      timestamp: testMetrics.timestamp,
      file: testMetrics.file,
      baseline: this.baseline.metrics,
      current: testMetrics.metrics,
      deltas: {},
      regressions: []
    };

    // Calculate deltas
    for (const [key, value] of Object.entries(testMetrics.metrics)) {
      const baselineValue = this.baseline.metrics[key];
      const delta = value - baselineValue;
      const percentChange = baselineValue !== 0 
        ? ((delta / baselineValue) * 100).toFixed(2)
        : 0;

      comparison.deltas[key] = {
        delta: delta.toFixed(2),
        percentChange: percentChange + '%',
        direction: delta > 0 ? 'increase' : 'decrease'
      };

      // Detect regressions (negative is bad for latency/errors, good for throughput)
      const isLatencyMetric = key.includes('Latency') || key === 'errorRate';
      const isRegression = isLatencyMetric ? delta > 0 : delta < 0;

      if (Math.abs(percentChange) > 10 && isRegression) {
        comparison.regressions.push({
          metric: key,
          change: percentChange + '%',
          baseline: baselineValue.toFixed(2),
          current: value.toFixed(2)
        });
      }
    }

    // Add to history
    this.baseline.history.push(comparison);
    this.saveBaseline();

    return comparison;
  }

  /**
   * Save baseline to file
   */
  saveBaseline() {
    try {
      fs.writeFileSync(this.baselineFile, JSON.stringify(this.baseline, null, 2));
      console.log(`✓ Baseline saved to ${this.baselineFile}`);
    } catch (error) {
      console.error(`Failed to save baseline: ${error.message}`);
    }
  }

  /**
   * Print baseline
   */
  printBaseline() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE BASELINE');
    console.log('='.repeat(80) + '\n');

    console.log(`Created: ${this.baseline.created}\n`);
    console.log('Metrics:');
    console.log(`  • Avg Latency: ${this.baseline.metrics.avgLatency.toFixed(2)}ms`);
    console.log(`  • P95 Latency: ${this.baseline.metrics.p95Latency.toFixed(2)}ms`);
    console.log(`  • P99 Latency: ${this.baseline.metrics.p99Latency.toFixed(2)}ms`);
    console.log(`  • Max Latency: ${this.baseline.metrics.maxLatency.toFixed(2)}ms`);
    console.log(`  • Error Rate: ${this.baseline.metrics.errorRate.toFixed(2)}%`);
    console.log(`  • Throughput: ${this.baseline.metrics.throughput.toFixed(2)} req/s`);

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Print comparison report
   */
  printComparison(comparison) {
    console.log('\n' + '='.repeat(80));
    console.log('📈 REGRESSION ANALYSIS vs BASELINE');
    console.log('='.repeat(80) + '\n');

    console.log(`Test: ${comparison.file}`);
    console.log(`Timestamp: ${comparison.timestamp}\n`);

    console.log('Metric Comparison:');
    console.log('-'.repeat(80));
    console.log(this.formatComparisonTable(comparison));
    console.log('-'.repeat(80) + '\n');

    if (comparison.regressions.length > 0) {
      console.log('⚠️  REGRESSIONS DETECTED:\n');
      for (const regression of comparison.regressions) {
        console.log(`  ❌ ${regression.metric}`);
        console.log(`     Change: ${regression.change}`);
        console.log(`     Baseline: ${regression.baseline} → Current: ${regression.current}\n`);
      }
    } else {
      console.log('✅ No significant regressions detected\n');
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Format comparison table
   */
  formatComparisonTable(comparison) {
    const headers = ['Metric', 'Baseline', 'Current', 'Change', 'Status'];
    const rows = [];

    for (const [metric, delta] of Object.entries(comparison.deltas)) {
      const baseline = comparison.baseline[metric];
      const current = comparison.current[metric];
      const isRegression = comparison.regressions.some(r => r.metric === metric);

      rows.push([
        metric,
        baseline.toFixed(2),
        current.toFixed(2),
        `${delta.direction === 'increase' ? '+' : '-'}${Math.abs(delta.percentChange)}%`,
        isRegression ? '❌' : '✓'
      ]);
    }

    // Format as table
    let table = headers.map(h => h.padEnd(15)).join(' | ') + '\n';
    table += rows.map(row => row.map(cell => cell.toString().padEnd(15)).join(' | ')).join('\n');

    return table;
  }

  /**
   * Get trend analysis
   */
  getTrendAnalysis() {
    if (this.baseline.history.length < 2) {
      console.log('Not enough history for trend analysis');
      return null;
    }

    const recent = this.baseline.history.slice(-5); // Last 5 tests
    const trends = {};

    for (const key of Object.keys(this.baseline.metrics)) {
      const values = recent.map(h => h.current[key]);
      const trend = {
        latest: values[values.length - 1],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        direction: values[values.length - 1] >= values[0] ? 'increasing' : 'decreasing'
      };
      trends[key] = trend;
    }

    return trends;
  }

  /**
   * Print trend analysis
   */
  printTrendAnalysis() {
    const trends = this.getTrendAnalysis();

    if (!trends) return;

    console.log('\n' + '='.repeat(80));
    console.log('📉 PERFORMANCE TREND ANALYSIS (Last 5 Tests)');
    console.log('='.repeat(80) + '\n');

    for (const [metric, trend] of Object.entries(trends)) {
      console.log(`${metric}:`);
      console.log(`  • Latest: ${trend.latest.toFixed(2)}`);
      console.log(`  • Average: ${trend.average.toFixed(2)}`);
      console.log(`  • Range: ${trend.min.toFixed(2)} - ${trend.max.toFixed(2)}`);
      console.log(`  • Trend: ${trend.direction}\n`);
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Reset baseline
   */
  resetBaseline() {
    this.baseline = {
      created: new Date().toISOString(),
      metrics: {
        avgLatency: null,
        p95Latency: null,
        p99Latency: null,
        maxLatency: null,
        errorRate: null,
        throughput: null
      },
      history: []
    };
    this.saveBaseline();
    console.log('✓ Baseline reset');
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  const resultFile = process.argv[3];
  const resultsDir = process.argv[4] || './test-results';

  const calculator = new BaselineCalculator(resultsDir);

  if (command === '--set' && resultFile) {
    calculator.setBaseline(resultFile);
  } else if (command === '--compare' && resultFile) {
    const comparison = calculator.compareToBaseline(resultFile);
    if (comparison) {
      calculator.printComparison(comparison);
    }
  } else if (command === '--trend') {
    calculator.printTrendAnalysis();
  } else if (command === '--reset') {
    calculator.resetBaseline();
  } else {
    console.log(`Usage: node baseline-calculator.js [COMMAND] [FILE] [RESULTS_DIR]
    
Commands:
  --set RESULT_FILE      Set baseline from test results
  --compare RESULT_FILE  Compare test results to baseline
  --trend                Print performance trend analysis
  --reset                Reset baseline

Examples:
  node baseline-calculator.js --set results.json
  node baseline-calculator.js --compare latest-results.json
  node baseline-calculator.js --trend
`);
  }
}

module.exports = BaselineCalculator;
