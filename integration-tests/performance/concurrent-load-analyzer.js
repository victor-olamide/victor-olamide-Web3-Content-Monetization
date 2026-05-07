#!/usr/bin/env node

/**
 * Concurrent User Load Test Analysis Tool
 * Analyzes Artillery concurrent user test results and provides load testing insights
 */

const fs = require('fs');
const path = require('path');

class ConcurrentLoadAnalyzer {
  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'test-results');
    this.performanceDir = path.join(__dirname);
  }

  async analyzeResults(testName = 'concurrent-users') {
    const reportFile = path.join(this.resultsDir, `${testName}-report.json`);

    if (!fs.existsSync(reportFile)) {
      console.error(`❌ Report file not found: ${reportFile}`);
      console.log('💡 Make sure to run the concurrent load test first:');
      console.log(`   artillery run performance/${testName}-artillery.yml --output ${this.resultsDir}/${testName}-report.json`);
      return;
    }

    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    this.generateAnalysis(report, testName);
  }

  generateAnalysis(report, testName) {
    console.log(`\n📊 Concurrent User Load Test Analysis - ${testName.toUpperCase()}`);
    console.log('='.repeat(60));

    // Overall metrics
    const overall = report.aggregate;
    console.log('\n🎯 OVERALL LOAD METRICS');
    console.log('-'.repeat(40));
    console.log(`✅ Requests: ${overall.requestsCompleted}`);
    console.log(`❌ Errors: ${overall.errorsEncountered} (${((overall.errorsEncountered / overall.requestsCompleted) * 100).toFixed(2)}%)`);
    console.log(`📈 Throughput: ${overall.rps.mean.toFixed(2)} req/sec`);
    console.log(`⏱️  Response Time (avg): ${overall.latency.mean.toFixed(2)}ms`);
    console.log(`⏱️  Response Time (p95): ${overall.latency.p95.toFixed(2)}ms`);
    console.log(`⏱️  Response Time (p99): ${overall.latency.p99.toFixed(2)}ms`);

    // Custom metrics from processor
    if (report.aggregate && report.aggregate.customStats) {
      console.log('\n📈 CUSTOM METRICS');
      console.log('-'.repeat(40));
      const customStats = report.aggregate.customStats;
      if (customStats.success_count) {
        console.log(`✅ Success Count: ${customStats.success_count}`);
      }
      if (customStats.client_error_count) {
        console.log(`⚠️  Client Errors: ${customStats.client_error_count}`);
      }
      if (customStats.server_error_count) {
        console.log(`❌ Server Errors: ${customStats.server_error_count}`);
      }
      if (customStats.response_size) {
        console.log(`📦 Avg Response Size: ${(customStats.response_size / overall.requestsCompleted).toFixed(2)} bytes`);
      }
    }

    // Scenario analysis
    if (report.aggregate && report.aggregate.scenarios) {
      console.log('\n🎬 SCENARIO PERFORMANCE');
      console.log('-'.repeat(40));
      report.aggregate.scenarios.forEach((scenario, index) => {
        console.log(`\n${index + 1}. ${scenario.name}`);
        console.log(`   Requests: ${scenario.requestsCompleted}`);
        console.log(`   Errors: ${scenario.errorsEncountered}`);
        console.log(`   Throughput: ${scenario.rps.mean.toFixed(2)} req/sec`);
        console.log(`   Response Time (avg): ${scenario.latency.mean.toFixed(2)}ms`);
        console.log(`   Response Time (p95): ${scenario.latency.p95.toFixed(2)}ms`);
      });
    }

    // Phase analysis
    if (report.aggregate && report.aggregate.phases) {
      console.log('\n⏱️  LOAD PHASES ANALYSIS');
      console.log('-'.repeat(40));
      report.aggregate.phases.forEach((phase, index) => {
        console.log(`\nPhase ${index + 1}: ${phase.name}`);
        console.log(`   Duration: ${phase.duration}s`);
        console.log(`   Arrival Rate: ${phase.arrivalRate} users/sec`);
        console.log(`   Requests: ${phase.requestsCompleted || 'N/A'}`);
        console.log(`   Errors: ${phase.errorsEncountered || 'N/A'}`);
      });
    }

    // Performance assessment
    this.assessPerformance(overall);

    // Recommendations
    this.generateRecommendations(overall);
  }

  assessPerformance(overall) {
    console.log('\n🎯 PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(40));

    const errorRate = (overall.errorsEncountered / overall.requestsCompleted) * 100;
    const p95Latency = overall.latency.p95;
    const throughput = overall.rps.mean;

    let score = 100;

    // Error rate assessment
    if (errorRate > 5) {
      console.log('❌ HIGH ERROR RATE: >5% errors detected');
      score -= 30;
    } else if (errorRate > 1) {
      console.log('⚠️  MODERATE ERROR RATE: 1-5% errors');
      score -= 10;
    } else {
      console.log('✅ LOW ERROR RATE: <1% errors');
    }

    // Latency assessment
    if (p95Latency > 5000) {
      console.log('❌ HIGH LATENCY: P95 > 5s');
      score -= 30;
    } else if (p95Latency > 2000) {
      console.log('⚠️  MODERATE LATENCY: P95 2-5s');
      score -= 15;
    } else {
      console.log('✅ GOOD LATENCY: P95 < 2s');
    }

    // Throughput assessment
    if (throughput < 10) {
      console.log('⚠️  LOW THROUGHPUT: < 10 req/sec');
      score -= 10;
    } else if (throughput > 50) {
      console.log('✅ HIGH THROUGHPUT: > 50 req/sec');
    }

    console.log(`\n📊 OVERALL SCORE: ${score}/100`);
    if (score >= 80) {
      console.log('🎉 EXCELLENT: System handles concurrent load well');
    } else if (score >= 60) {
      console.log('👍 GOOD: System performs adequately under load');
    } else {
      console.log('⚠️  NEEDS IMPROVEMENT: System struggles with concurrent users');
    }
  }

  generateRecommendations(overall) {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));

    const errorRate = (overall.errorsEncountered / overall.requestsCompleted) * 100;
    const p95Latency = overall.latency.p95;

    if (errorRate > 5) {
      console.log('• Investigate error sources - check server logs');
      console.log('• Consider implementing circuit breakers');
      console.log('• Review database connection pooling');
    }

    if (p95Latency > 2000) {
      console.log('• Optimize database queries and indexes');
      console.log('• Consider caching frequently accessed data');
      console.log('• Review server resource allocation');
    }

    if (overall.rps.mean < 20) {
      console.log('• Scale horizontally by adding more server instances');
      console.log('• Optimize application code for better performance');
      console.log('• Consider CDN for static content delivery');
    }

    console.log('• Monitor system resources (CPU, memory, disk I/O)');
    console.log('• Implement proper load balancing');
    console.log('• Set up automated scaling based on load metrics');
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new ConcurrentLoadAnalyzer();
  const testName = process.argv[2] || 'concurrent-users';
  analyzer.analyzeResults(testName);
}

module.exports = ConcurrentLoadAnalyzer;