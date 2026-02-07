const fs = require('fs');
const path = require('path');

class TestReporter {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: []
    };
  }

  onRunStart() {
    this.startTime = Date.now();
    console.log('\n🧪 Starting Integration Tests on Stacks Testnet\n');
  }

  onTestResult(test, testResult) {
    const suite = {
      name: path.basename(testResult.testFilePath),
      tests: testResult.testResults.length,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      skipped: testResult.numPendingTests,
      duration: testResult.perfStats.runtime
    };

    this.results.suites.push(suite);
    this.results.total += suite.tests;
    this.results.passed += suite.passed;
    this.results.failed += suite.failed;
    this.results.skipped += suite.skipped;
  }

  onRunComplete() {
    this.results.duration = Date.now() - this.startTime;
    this.generateReport();
  }

  generateReport() {
    const report = `
# Integration Test Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Tests**: ${this.results.total}
- **Passed**: ✅ ${this.results.passed}
- **Failed**: ❌ ${this.results.failed}
- **Skipped**: ⏭️ ${this.results.skipped}
- **Duration**: ${(this.results.duration / 1000).toFixed(2)}s

## Test Suites

${this.results.suites.map(suite => `
### ${suite.name}
- Tests: ${suite.tests}
- Passed: ${suite.passed}
- Failed: ${suite.failed}
- Duration: ${(suite.duration / 1000).toFixed(2)}s
`).join('\n')}

## Status
${this.results.failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}
`;

    const reportPath = path.join(__dirname, 'test-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📊 Test report generated: ${reportPath}\n`);
  }
}

module.exports = TestReporter;
