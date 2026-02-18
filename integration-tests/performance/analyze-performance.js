#!/usr/bin/env node

/**
 * Content Delivery Performance Analysis Tool
 * Analyzes Artillery test results and provides performance insights
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'test-results');
    this.performanceDir = path.join(__dirname);
  }

  async analyzeResults(testName) {
    const reportFile = path.join(this.resultsDir, `${testName}-report.json`);

    if (!fs.existsSync(reportFile)) {
      console.error(`❌ Report file not found: ${reportFile}`);
      console.log('💡 Make sure to run the performance tests first:');
      console.log(`   artillery run performance/${testName}.yml --output ${this.resultsDir}/${testName}-report.json`);
      return;
    }

    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    this.generateAnalysis(report, testName);
  }

  generateAnalysis(report, testName) {
    console.log(`\n📊 Content Delivery Performance Analysis - ${testName.toUpperCase()}`);
    console.log('='.repeat(60));

    // Overall metrics
    const overall = report.aggregate;
    console.log('\n🎯 OVERALL PERFORMANCE METRICS');
    console.log('-'.repeat(40));
    console.log(`✅ Requests: ${overall.requestsCompleted}`);
    console.log(`❌ Errors: ${overall.errorsEncountered} (${((overall.errorsEncountered / overall.requestsCompleted) * 100).toFixed(2)}%)`);
    console.log(`📈 Throughput: ${overall.rps.mean.toFixed(2)} req/sec`);
    console.log(`⏱️  Response Time (avg): ${overall.latency.mean.toFixed(2)}ms`);
    console.log(`⏱️  Response Time (p95): ${overall.latency.p95.toFixed(2)}ms`);
    console.log(`⏱️  Response Time (p99): ${overall.latency.p99.toFixed(2)}ms`);

    // Scenario analysis
    if (report.aggregate && report.aggregate.scenarios) {
      console.log('\n🎬 SCENARIO PERFORMANCE');
      console.log('-'.repeat(40));

      Object.entries(report.aggregate.scenarios).forEach(([scenario, metrics]) => {
        console.log(`\n📋 ${scenario}`);
        console.log(`   Requests: ${metrics.requestsCompleted}`);
        console.log(`   Response Time: ${metrics.latency.mean.toFixed(2)}ms (p95: ${metrics.latency.p95.toFixed(2)}ms)`);
        console.log(`   Error Rate: ${((metrics.errorsEncountered / metrics.requestsCompleted) * 100).toFixed(2)}%`);
      });
    }

    // Endpoint analysis
    if (report.aggregate && report.aggregate.byEndpoint) {
      console.log('\n🌐 ENDPOINT PERFORMANCE');
      console.log('-'.repeat(40));

      Object.entries(report.aggregate.byEndpoint).forEach(([endpoint, metrics]) => {
        console.log(`\n🔗 ${endpoint}`);
        console.log(`   Requests: ${metrics.requestsCompleted}`);
        console.log(`   Response Time: ${metrics.latency.mean.toFixed(2)}ms`);
        console.log(`   Error Rate: ${((metrics.errorsEncountered / metrics.requestsCompleted) * 100).toFixed(2)}%`);
      });
    }

    // Performance assessment
    this.assessPerformance(report, testName);

    // Recommendations
    this.generateRecommendations(report, testName);
  }

  assessPerformance(report, testName) {
    console.log('\n🎯 PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(40));

    const overall = report.aggregate;
    const errorRate = (overall.errorsEncountered / overall.requestsCompleted) * 100;
    const p95Latency = overall.latency.p95;
    const throughput = overall.rps.mean;

    // Content delivery specific thresholds
    const thresholds = {
      'content-delivery': {
        maxErrorRate: 1.0,
        maxP95Latency: 2000,
        minThroughput: 10
      },
      'video-streaming': {
        maxErrorRate: 2.0,
        maxP95Latency: 5000,
        minThroughput: 5
      }
    };

    const testType = testName.includes('video') ? 'video-streaming' : 'content-delivery';
    const threshold = thresholds[testType];

    let score = 0;
    let totalChecks = 3;

    // Error rate check
    if (errorRate <= threshold.maxErrorRate) {
      console.log(`✅ Error Rate: ${errorRate.toFixed(2)}% (Target: ≤${threshold.maxErrorRate}%)`);
      score++;
    } else {
      console.log(`❌ Error Rate: ${errorRate.toFixed(2)}% (Target: ≤${threshold.maxErrorRate}%)`);
    }

    // Latency check
    if (p95Latency <= threshold.maxP95Latency) {
      console.log(`✅ P95 Latency: ${p95Latency.toFixed(2)}ms (Target: ≤${threshold.maxP95Latency}ms)`);
      score++;
    } else {
      console.log(`❌ P95 Latency: ${p95Latency.toFixed(2)}ms (Target: ≤${threshold.maxP95Latency}ms)`);
    }

    // Throughput check
    if (throughput >= threshold.minThroughput) {
      console.log(`✅ Throughput: ${throughput.toFixed(2)} req/sec (Target: ≥${threshold.minThroughput})`);
      score++;
    } else {
      console.log(`❌ Throughput: ${throughput.toFixed(2)} req/sec (Target: ≥${threshold.minThroughput})`);
    }

    const percentage = (score / totalChecks) * 100;
    const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : 'F';

    console.log(`\n📊 Performance Score: ${score}/${totalChecks} (${percentage.toFixed(1)}%) - Grade: ${grade}`);
  }

  generateRecommendations(report, testName) {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));

    const overall = report.aggregate;
    const errorRate = (overall.errorsEncountered / overall.requestsCompleted) * 100;
    const p95Latency = overall.latency.p95;

    const recommendations = [];

    if (errorRate > 1.0) {
      recommendations.push('🔧 High error rate detected. Check server logs for 5xx errors and implement circuit breakers.');
    }

    if (p95Latency > 3000) {
      recommendations.push('⚡ High latency detected. Consider implementing CDN caching and database query optimization.');
    }

    if (overall.rps.mean < 10) {
      recommendations.push('📈 Low throughput. Consider horizontal scaling and connection pooling.');
    }

    // Content delivery specific recommendations
    if (testName.includes('video')) {
      recommendations.push('🎬 For video streaming: Implement adaptive bitrate streaming and video chunking.');
      recommendations.push('💾 Consider video preprocessing and format optimization for better delivery.');
    }

    if (testName.includes('content')) {
      recommendations.push('📦 Implement response compression and caching headers for better performance.');
      recommendations.push('🔄 Consider implementing pagination and lazy loading for large content lists.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance looks good! Continue monitoring and consider implementing advanced caching strategies.');
    }

    recommendations.forEach(rec => console.log(`   ${rec}`));
  }

  async runComparison(testNames) {
    console.log('\n📊 PERFORMANCE COMPARISON');
    console.log('='.repeat(60));

    const results = {};

    for (const testName of testNames) {
      const reportFile = path.join(this.resultsDir, `${testName}-report.json`);
      if (fs.existsSync(reportFile)) {
        results[testName] = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      }
    }

    if (Object.keys(results).length === 0) {
      console.log('❌ No test results found. Run tests first.');
      return;
    }

    console.log('| Test Name | Requests | Errors | P95 Latency | Throughput |');
    console.log('|-----------|----------|--------|-------------|------------|');

    Object.entries(results).forEach(([testName, report]) => {
      const overall = report.aggregate;
      const errorRate = ((overall.errorsEncountered / overall.requestsCompleted) * 100).toFixed(2);
      const p95Latency = overall.latency.p95.toFixed(0);
      const throughput = overall.rps.mean.toFixed(2);

      console.log(`| ${testName.padEnd(10)} | ${overall.requestsCompleted.toString().padEnd(8)} | ${errorRate.padEnd(6)}% | ${p95Latency.padEnd(11)}ms | ${throughput.padEnd(10)} req/sec |`);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const analyzer = new PerformanceAnalyzer();

  if (args.length === 0) {
    console.log('Usage: node analyze-performance.js <test-name> [compare test1 test2 ...]');
    console.log('\nAvailable tests:');
    console.log('  content-delivery-load-test');
    console.log('  video-streaming-load-test');
    console.log('\nExamples:');
    console.log('  node analyze-performance.js content-delivery-load-test');
    console.log('  node analyze-performance.js compare content-delivery-load-test video-streaming-load-test');
    return;
  }

  if (args[0] === 'compare') {
    await analyzer.runComparison(args.slice(1));
  } else {
    await analyzer.analyzeResults(args[0]);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceAnalyzer;