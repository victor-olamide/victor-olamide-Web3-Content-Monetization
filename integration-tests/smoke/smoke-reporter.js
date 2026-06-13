'use strict';

/**
 * Smoke test result reporter (#195).
 * Saves JSON report to test-results/ for CI artifact upload and audit.
 */

const fs   = require('fs');
const path = require('path');

function saveReport(results, baseUrl, environment) {
  const dir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const ts   = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `smoke-report-${ts}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    environment,
    deployment_url: baseUrl,
    summary: {
      passed:       results.passed,
      failed:       results.failed,
      skipped:      results.skipped,
      success_rate: results.passed + results.failed > 0
        ? `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
        : '0.0%',
    },
    deployment_ready: results.tests.filter(t => t.status === 'FAILED' && t.critical).length === 0,
    critical_failures: results.tests.filter(t => t.status === 'FAILED' && t.critical),
    non_critical_failures: results.tests.filter(t => t.status === 'FAILED' && !t.critical),
    tests: results.tests,
  };

  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved: ${file}`);
  return file;
}

module.exports = { saveReport };
