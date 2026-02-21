/**
 * Concurrent User Load Test - Comparative Analysis
 * Compares results across multiple test runs to identify trends
 */

const fs = require('fs');
const path = require('path');

class LoadTestComparator {
  constructor(resultsDir = './test-results') {
    this.resultsDir = resultsDir;
    this.testRuns = [];
  }

  /**
   * Load all test results from directory
   */
  loadTestResults() {
    if (!fs.existsSync(this.resultsDir)) {
      console.log(`Results directory not found: ${this.resultsDir}`);
      return;
    }

    const files = fs.readdirSync(this.resultsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('metrics'));

    for (const file of jsonFiles) {
      const filePath = path.join(this.resultsDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.testRuns.push({
          name: file.replace('.json', ''),
          timestamp: new Date().toISOString(),
          data: data
        });
      } catch (error) {
        console.warn(`Failed to load ${file}: ${error.message}`);
      }
    }

    console.log(`Loaded ${this.testRuns.length} test runs for comparison`);
  }

  /**
   * Extract key metrics from test run
   */
  extractMetrics(testRun) {
    const data = testRun.data;
    
    return {
      testName: testRun.name,
      timestamp: testRun.timestamp,
      totalRequests: data.aggregate?.summary?.numCompleted || 0,
      successfulRequests: data.aggregate?.summary?.numSuccessful || 0,
      failedRequests: data.aggregate?.summary?.numErrors || 0,
      avgLatency: data.aggregate?.latency?.mean || 0,
      p95Latency: data.aggregate?.latency?.p95 || 0,
      p99Latency: data.aggregate?.latency?.p99 || 0,
      maxLatency: data.aggregate?.latency?.max || 0,
      throughput: data.aggregate?.summary?.rps?.mean || 0,
      errorRate: this.calculateErrorRate(data.aggregate?.summary || {})
    };
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(summary) {
    const total = summary.numCompleted || 0;
    const errors = summary.numErrors || 0;
    return total > 0 ? ((errors / total) * 100).toFixed(2) : 0;
  }

  /**
   * Generate comparison table
   */
  generateComparisonTable() {
    if (this.testRuns.length === 0) {
      console.log('No test runs available for comparison');
      return '';
    }

    const metrics = this.testRuns.map(run => this.extractMetrics(run));

    let table = '\n' + '='.repeat(120) + '\n';
    table += 'CONCURRENT USER LOAD TEST - COMPARISON ANALYSIS\n';
    table += '='.repeat(120) + '\n\n';

    // Create comparison table
    table += 'TEST METRICS COMPARISON:\n';
    table += '-'.repeat(120) + '\n';
    table += this.formatTableHeader();
    table += '-'.repeat(120) + '\n';

    for (const metric of metrics) {
      table += this.formatTableRow(metric);
    }

    table += '-'.repeat(120) + '\n\n';

    // Trend analysis
    table += this.generateTrendAnalysis(metrics);

    // Performance recommendations
    table += this.generateComparativeRecommendations(metrics);

    return table;
  }

  /**
   * Format table header
   */
  formatTableHeader() {
    return [
      'Test Name'.padEnd(25),
      'Total Req'.padEnd(12),
      'Success %'.padEnd(12),
      'Avg Lat (ms)'.padEnd(14),
      'P95 (ms)'.padEnd(12),
      'P99 (ms)'.padEnd(12),
      'Throughput'.padEnd(12),
      'Error %'.padEnd(10)
    ].join(' | ') + '\n';
  }

  /**
   * Format table row
   */
  formatTableRow(metric) {
    const successRate = metric.totalRequests > 0 
      ? ((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1)
      : 0;

    return [
      metric.testName.substring(0, 24).padEnd(25),
      metric.totalRequests.toString().padEnd(12),
      `${successRate}%`.padEnd(12),
      metric.avgLatency.toFixed(2).padEnd(14),
      metric.p95Latency.toFixed(2).padEnd(12),
      metric.p99Latency.toFixed(2).padEnd(12),
      metric.throughput.toFixed(2).padEnd(12),
      `${metric.errorRate}%`.padEnd(10)
    ].join(' | ') + '\n';
  }

  /**
   * Generate trend analysis
   */
  generateTrendAnalysis(metrics) {
    if (metrics.length < 2) {
      return '';
    }

    let analysis = '📈 TREND ANALYSIS:\n';
    analysis += '-'.repeat(120) + '\n';

    // Latency trend
    const latencyTrend = metrics[metrics.length - 1].avgLatency - metrics[0].avgLatency;
    const latencyTrendDir = latencyTrend > 0 ? '⬆️ INCREASED' : '⬇️ DECREASED';
    analysis += `• Average Latency: ${latencyTrendDir} by ${Math.abs(latencyTrend).toFixed(2)}ms\n`;

    // Throughput trend
    const throughputTrend = metrics[metrics.length - 1].throughput - metrics[0].throughput;
    const throughputTrendDir = throughputTrend > 0 ? '⬆️ INCREASED' : '⬇️ DECREASED';
    analysis += `• Throughput: ${throughputTrendDir} by ${Math.abs(throughputTrend).toFixed(2)} req/s\n`;

    // Error rate trend
    const errorTrend = parseFloat(metrics[metrics.length - 1].errorRate) - parseFloat(metrics[0].errorRate);
    const errorTrendDir = errorTrend > 0 ? '⬆️ INCREASED' : '⬇️ DECREASED';
    analysis += `• Error Rate: ${errorTrendDir} by ${Math.abs(errorTrend).toFixed(2)}%\n`;

    // P99 latency trend
    const p99Trend = metrics[metrics.length - 1].p99Latency - metrics[0].p99Latency;
    const p99TrendDir = p99Trend > 0 ? '⬆️ INCREASED' : '⬇️ DECREASED';
    analysis += `• P99 Latency: ${p99TrendDir} by ${Math.abs(p99Trend).toFixed(2)}ms\n`;

    analysis += '\n';
    return analysis;
  }

  /**
   * Generate comparative recommendations
   */
  generateComparativeRecommendations(metrics) {
    let recommendations = '💡 COMPARATIVE RECOMMENDATIONS:\n';
    recommendations += '-'.repeat(120) + '\n';

    // Find worst performing test
    const worstByLatency = metrics.reduce((prev, current) => 
      prev.avgLatency > current.avgLatency ? prev : current
    );

    // Find best performing test
    const bestByThroughput = metrics.reduce((prev, current) => 
      prev.throughput > current.throughput ? prev : current
    );

    recommendations += `\n• Best Throughput: ${bestByThroughput.testName} with ${bestByThroughput.throughput.toFixed(2)} req/s\n`;
    recommendations += `• Worst Latency: ${worstByLatency.testName} with ${worstByLatency.avgLatency.toFixed(2)}ms average\n`;

    // Check for regressions
    if (metrics.length >= 2) {
      const latest = metrics[metrics.length - 1];
      const previous = metrics[metrics.length - 2];

      const latencyRegression = latest.avgLatency - previous.avgLatency;
      if (latencyRegression > 100) {
        recommendations += `\n⚠️  REGRESSION DETECTED: Average latency increased by ${latencyRegression.toFixed(2)}ms\n`;
        recommendations += `   Consider investigating application changes or infrastructure issues\n`;
      }

      const errorRateRegression = parseFloat(latest.errorRate) - parseFloat(previous.errorRate);
      if (errorRateRegression > 2) {
        recommendations += `\n⚠️  ERROR RATE REGRESSION: Error rate increased by ${errorRateRegression.toFixed(2)}%\n`;
        recommendations += `   Review error logs and implement fixes\n`;
      }
    }

    // General performance assessment
    const avgLatency = metrics.reduce((sum, m) => sum + m.avgLatency, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + parseFloat(m.errorRate), 0) / metrics.length;

    if (avgLatency < 100 && avgErrorRate < 1) {
      recommendations += '\n✅ System performing excellently under concurrent load\n';
    } else if (avgLatency < 500 && avgErrorRate < 5) {
      recommendations += '\n✅ System performing acceptably under concurrent load\n';
    } else {
      recommendations += '\n⚠️  System may struggle under sustained concurrent load\n';
      recommendations += '   Consider optimization of slow endpoints or infrastructure scaling\n';
    }

    recommendations += '\n' + '='.repeat(120) + '\n';

    return recommendations;
  }

  /**
   * Generate PDF report (requires additional library)
   */
  generateComparison() {
    this.loadTestResults();
    const report = this.generateComparisonTable();
    console.log(report);

    // Save report
    const reportPath = path.join(this.resultsDir, 'concurrent-load-comparison-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Comparison report saved to: ${reportPath}`);
  }

  /**
   * Export comparison data as CSV
   */
  exportAsCSV() {
    if (this.testRuns.length === 0) {
      console.log('No test runs available for export');
      return;
    }

    const metrics = this.testRuns.map(run => this.extractMetrics(run));
    
    const headers = [
      'Test Name',
      'Timestamp',
      'Total Requests',
      'Successful Requests',
      'Failed Requests',
      'Avg Latency (ms)',
      'P95 Latency (ms)',
      'P99 Latency (ms)',
      'Max Latency (ms)',
      'Throughput (req/s)',
      'Error Rate (%)'
    ];

    const rows = metrics.map(m => [
      m.testName,
      m.timestamp,
      m.totalRequests,
      m.successfulRequests,
      m.failedRequests,
      m.avgLatency.toFixed(2),
      m.p95Latency.toFixed(2),
      m.p99Latency.toFixed(2),
      m.maxLatency.toFixed(2),
      m.throughput.toFixed(2),
      m.errorRate
    ]);

    let csv = headers.join(',') + '\n';
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const csvPath = path.join(this.resultsDir, 'concurrent-load-comparison.csv');
    fs.writeFileSync(csvPath, csv);
    console.log(`✅ CSV export saved to: ${csvPath}`);
  }
}

// Main execution
if (require.main === module) {
  const comparator = new LoadTestComparator(process.argv[2] || './test-results');
  comparator.generateComparison();
  comparator.exportAsCSV();
}

module.exports = LoadTestComparator;
