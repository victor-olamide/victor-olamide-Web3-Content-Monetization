/**
 * Performance Analysis for Concurrent User Load Tests
 * Analyzes Artillery and Locust results to identify bottlenecks
 */

const fs = require('fs');
const path = require('path');

class LoadTestAnalyzer {
  constructor(resultsDir = './test-results') {
    this.resultsDir = resultsDir;
    this.results = {};
  }

  /**
   * Analyze Artillery JSON results
   */
  analyzeArtilleryResults(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const analysis = {
        timestamp: new Date(data.aggregate.timestamp).toISOString(),
        summary: data.aggregate.summary,
        scenarioMetrics: {},
        aggregatedMetrics: {}
      };

      // Analyze per-scenario metrics
      if (data.aggregate.scenarioSummary) {
        for (const [scenario, metrics] of Object.entries(data.aggregate.scenarioSummary)) {
          analysis.scenarioMetrics[scenario] = {
            count: metrics.count,
            throughput: metrics.rps.mean,
            avgLatency: metrics.latency.mean,
            p99Latency: metrics.latency.p99,
            errorRate: metrics.codes ? this.calculateErrorRate(metrics.codes) : 0
          };
        }
      }

      // Analyze endpoint-level metrics
      if (data.aggregate.httpStatusCodeDistribution) {
        analysis.aggregatedMetrics.statusCodes = data.aggregate.httpStatusCodeDistribution;
      }

      // Analyze response time percentiles
      if (data.aggregate.latency) {
        analysis.aggregatedMetrics.latency = {
          min: data.aggregate.latency.min,
          max: data.aggregate.latency.max,
          mean: data.aggregate.latency.mean,
          median: data.aggregate.latency.median,
          p95: data.aggregate.latency.p95,
          p99: data.aggregate.latency.p99
        };
      }

      return analysis;
    } catch (error) {
      console.error(`Error analyzing Artillery results: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate error rate from status code distribution
   */
  calculateErrorRate(codes) {
    const errors = Object.entries(codes)
      .filter(([code]) => parseInt(code) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);
    
    const total = Object.values(codes).reduce((sum, count) => sum + count, 0);
    return total > 0 ? ((errors / total) * 100).toFixed(2) : 0;
  }

  /**
   * Generate performance report
   */
  generateReport(analysisResults) {
    let report = '\n' + '='.repeat(80) + '\n';
    report += 'CONCURRENT USER LOAD TEST ANALYSIS REPORT\n';
    report += '='.repeat(80) + '\n\n';

    for (const [testName, analysis] of Object.entries(analysisResults)) {
      if (!analysis) continue;

      report += `\n📊 TEST: ${testName}\n`;
      report += `⏰ Timestamp: ${analysis.timestamp}\n`;
      report += `-`.repeat(80) + '\n';

      // Summary metrics
      if (analysis.summary) {
        report += '\n📈 SUMMARY METRICS:\n';
        report += `  • Total Requests: ${analysis.summary.numCompleted || 'N/A'}\n`;
        report += `  • Successful: ${analysis.summary.numSuccessful || 'N/A'}\n`;
        report += `  • Failed: ${analysis.summary.numFailedContentCheck || 0}\n`;
        report += `  • Total Errors: ${analysis.summary.numErrors || 0}\n`;
      }

      // Latency metrics
      if (analysis.aggregatedMetrics.latency) {
        const latency = analysis.aggregatedMetrics.latency;
        report += '\n⏱️  LATENCY METRICS (ms):\n';
        report += `  • Min: ${latency.min.toFixed(2)}\n`;
        report += `  • Mean: ${latency.mean.toFixed(2)}\n`;
        report += `  • Median: ${latency.median.toFixed(2)}\n`;
        report += `  • P95: ${latency.p95.toFixed(2)}\n`;
        report += `  • P99: ${latency.p99.toFixed(2)}\n`;
        report += `  • Max: ${latency.max.toFixed(2)}\n`;
      }

      // Status code distribution
      if (analysis.aggregatedMetrics.statusCodes) {
        report += '\n🔢 HTTP STATUS DISTRIBUTION:\n';
        const codes = analysis.aggregatedMetrics.statusCodes;
        for (const [code, count] of Object.entries(codes)) {
          const percentage = ((count / analysis.summary.numCompleted) * 100).toFixed(2);
          report += `  • ${code}: ${count} (${percentage}%)\n`;
        }
      }

      // Scenario metrics
      if (Object.keys(analysis.scenarioMetrics).length > 0) {
        report += '\n🎯 SCENARIO METRICS:\n';
        for (const [scenario, metrics] of Object.entries(analysis.scenarioMetrics)) {
          report += `  \n  Scenario: ${scenario}\n`;
          report += `    • Requests: ${metrics.count}\n`;
          report += `    • Throughput: ${metrics.throughput.toFixed(2)} req/s\n`;
          report += `    • Avg Latency: ${metrics.avgLatency.toFixed(2)}ms\n`;
          report += `    • P99 Latency: ${metrics.p99Latency.toFixed(2)}ms\n`;
          report += `    • Error Rate: ${metrics.errorRate}%\n`;
        }
      }

      report += '\n' + '-'.repeat(80) + '\n';
    }

    // Performance recommendations
    report += '\n💡 RECOMMENDATIONS:\n';
    report += this.generateRecommendations(analysisResults);
    
    report += '\n' + '='.repeat(80) + '\n\n';
    return report;
  }

  /**
   * Generate performance improvement recommendations
   */
  generateRecommendations(analysisResults) {
    let recommendations = '';

    for (const [testName, analysis] of Object.entries(analysisResults)) {
      if (!analysis) continue;

      recommendations += `\n${testName}:\n`;

      if (analysis.aggregatedMetrics.latency) {
        const latency = analysis.aggregatedMetrics.latency;
        if (latency.p99 > 5000) {
          recommendations += '  ⚠️  P99 latency exceeds 5000ms - Consider optimizing slow endpoints\n';
        }
        if (latency.max > 10000) {
          recommendations += '  ⚠️  Max latency exceeds 10s - Review database queries and external API calls\n';
        }
      }

      // Check error rate
      for (const [scenario, metrics] of Object.entries(analysis.scenarioMetrics || {})) {
        if (metrics.errorRate > 5) {
          recommendations += `  ⚠️  Error rate ${metrics.errorRate}% in ${scenario} - Investigate error causes\n`;
        }
      }
    }

    if (!recommendations.trim()) {
      recommendations = '  ✅ System performing well under concurrent load\n';
    }

    return recommendations;
  }

  /**
   * Run analysis on all results
   */
  analyze() {
    if (!fs.existsSync(this.resultsDir)) {
      console.log(`Results directory not found: ${this.resultsDir}`);
      return;
    }

    const files = fs.readdirSync(this.resultsDir);
    const artilleryFiles = files.filter(f => f.includes('artillery') && f.endsWith('.json'));

    for (const file of artilleryFiles) {
      const filePath = path.join(this.resultsDir, file);
      const testName = file.replace('.json', '');
      console.log(`Analyzing: ${testName}`);
      this.results[testName] = this.analyzeArtilleryResults(filePath);
    }

    const report = this.generateReport(this.results);
    console.log(report);

    // Save report to file
    const reportPath = path.join(this.resultsDir, 'concurrent-load-test-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Report saved to: ${reportPath}`);
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new LoadTestAnalyzer(
    process.argv[2] || './test-results'
  );
  analyzer.analyze();
}

module.exports = LoadTestAnalyzer;
