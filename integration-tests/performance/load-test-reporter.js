/**
 * Concurrent User Load Test Reporter
 * Generates detailed HTML and JSON reports for load test results
 */

const fs = require('fs');
const path = require('path');

class LoadTestReporter {
  constructor(resultsDir = './test-results') {
    this.resultsDir = resultsDir;
  }

  /**
   * Generate HTML report from test results
   */
  generateHTMLReport(testResultsFile) {
    const resultsPath = path.join(this.resultsDir, testResultsFile);
    
    if (!fs.existsSync(resultsPath)) {
      console.error(`Results file not found: ${resultsPath}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const html = this.buildHTMLReport(data, testResultsFile);
    
    const reportPath = path.join(this.resultsDir, 
      testResultsFile.replace('.json', '-report.html'));
    fs.writeFileSync(reportPath, html);
    
    console.log(`✓ HTML report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Build HTML report content
   */
  buildHTMLReport(data, fileName) {
    const timestamp = new Date().toISOString();
    const metrics = data.aggregate || {};
    const latency = metrics.latency || {};
    const summary = metrics.summary || {};

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${fileName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 20px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }
        
        .metric-card h3 {
            color: #667eea;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .metric-card .value {
            font-size: 2em;
            color: #333;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-card .unit {
            color: #666;
            font-size: 0.9em;
        }
        
        .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
        }
        
        .status.pass {
            background: #d4edda;
            color: #155724;
        }
        
        .status.fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status.warning {
            background: #fff3cd;
            color: #856404;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
        }
        
        .chart-placeholder {
            background: #f8f9fa;
            border: 2px dashed #ddd;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #999;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Load Test Report</h1>
            <p>${fileName}</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Generated: ${timestamp}</p>
        </div>
        
        <div class="content">
            <!-- Summary Section -->
            <div class="section">
                <h2>Test Summary</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>Total Requests</h3>
                        <div class="value">${summary.numCompleted || 0}</div>
                    </div>
                    <div class="metric-card">
                        <h3>Success Rate</h3>
                        <div class="value">${((summary.numSuccessful / (summary.numCompleted || 1)) * 100).toFixed(1)}%</div>
                    </div>
                    <div class="metric-card">
                        <h3>Failed Requests</h3>
                        <div class="value">${summary.numErrors || 0}</div>
                    </div>
                    <div class="metric-card">
                        <h3>Error Rate</h3>
                        <div class="value">${((summary.numErrors / (summary.numCompleted || 1)) * 100).toFixed(2)}%</div>
                    </div>
                </div>
            </div>
            
            <!-- Latency Section -->
            <div class="section">
                <h2>Response Time (Latency)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Minimum</td>
                            <td>${latency.min ? latency.min.toFixed(2) : 'N/A'}ms</td>
                            <td><span class="status pass">✓</span></td>
                        </tr>
                        <tr>
                            <td>Average</td>
                            <td>${latency.mean ? latency.mean.toFixed(2) : 'N/A'}ms</td>
                            <td>${this.getLatencyStatus(latency.mean)}</td>
                        </tr>
                        <tr>
                            <td>Median</td>
                            <td>${latency.median ? latency.median.toFixed(2) : 'N/A'}ms</td>
                            <td>${this.getLatencyStatus(latency.median)}</td>
                        </tr>
                        <tr>
                            <td>P95</td>
                            <td>${latency.p95 ? latency.p95.toFixed(2) : 'N/A'}ms</td>
                            <td>${this.getLatencyStatus(latency.p95, true)}</td>
                        </tr>
                        <tr>
                            <td>P99</td>
                            <td>${latency.p99 ? latency.p99.toFixed(2) : 'N/A'}ms</td>
                            <td>${this.getLatencyStatus(latency.p99, true)}</td>
                        </tr>
                        <tr>
                            <td>Maximum</td>
                            <td>${latency.max ? latency.max.toFixed(2) : 'N/A'}ms</td>
                            <td>${this.getLatencyStatus(latency.max, true)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Throughput Section -->
            <div class="section">
                <h2>Throughput</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>Requests/sec</h3>
                        <div class="value">${summary.rps?.mean ? summary.rps.mean.toFixed(2) : 0}</div>
                        <div class="unit">req/s</div>
                    </div>
                    <div class="metric-card">
                        <h3>Min RPS</h3>
                        <div class="value">${summary.rps?.min ? summary.rps.min.toFixed(2) : 0}</div>
                    </div>
                    <div class="metric-card">
                        <h3>Max RPS</h3>
                        <div class="value">${summary.rps?.max ? summary.rps.max.toFixed(2) : 0}</div>
                    </div>
                    <div class="metric-card">
                        <h3>Duration</h3>
                        <div class="value">${Math.round((summary.testDuration || 0) / 1000)}</div>
                        <div class="unit">seconds</div>
                    </div>
                </div>
            </div>
            
            <!-- HTTP Status Codes -->
            <div class="section">
                <h2>HTTP Status Code Distribution</h2>
                ${this.buildStatusCodeTable(data.aggregate.httpStatusCodeDistribution)}
            </div>
        </div>
        
        <div class="footer">
            <p>Load Test Report | Generated on ${new Date().toLocaleString()}</p>
            <p>For more details, review the JSON results file</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Get status indicator for latency value
   */
  getLatencyStatus(value, isPercentile = false) {
    if (!value) return '<span class="status warning">?</span>';
    
    const threshold = isPercentile ? 2000 : 500;
    const warningThreshold = isPercentile ? 1000 : 200;
    
    if (value <= warningThreshold) {
      return '<span class="status pass">✓ Good</span>';
    } else if (value <= threshold) {
      return '<span class="status warning">⚠ Acceptable</span>';
    } else {
      return '<span class="status fail">✗ Poor</span>';
    }
  }

  /**
   * Build HTTP status code table
   */
  buildStatusCodeTable(statusCodes) {
    if (!statusCodes || Object.keys(statusCodes).length === 0) {
      return '<p>No status code data available</p>';
    }

    let html = '<table><thead><tr><th>Status Code</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    
    const total = Object.values(statusCodes).reduce((a, b) => a + b, 0);
    
    for (const [code, count] of Object.entries(statusCodes)) {
      const percentage = ((count / total) * 100).toFixed(2);
      const statusClass = code < 300 ? 'pass' : code < 500 ? 'warning' : 'fail';
      
      html += `
        <tr>
            <td>${code}</td>
            <td>${count}</td>
            <td><span class="status ${statusClass}">${percentage}%</span></td>
        </tr>
      `;
    }
    
    html += '</tbody></table>';
    return html;
  }

  /**
   * Generate summary JSON
   */
  generateSummaryJSON(testResultsFile) {
    const resultsPath = path.join(this.resultsDir, testResultsFile);
    
    if (!fs.existsSync(resultsPath)) {
      console.error(`Results file not found: ${resultsPath}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const metrics = data.aggregate || {};
    const latency = metrics.latency || {};
    const summary = metrics.summary || {};

    const summaryData = {
      timestamp: new Date().toISOString(),
      testFile: testResultsFile,
      summary: {
        totalRequests: summary.numCompleted || 0,
        successfulRequests: summary.numSuccessful || 0,
        failedRequests: summary.numErrors || 0,
        successRate: ((summary.numSuccessful / (summary.numCompleted || 1)) * 100).toFixed(2) + '%',
        errorRate: ((summary.numErrors / (summary.numCompleted || 1)) * 100).toFixed(2) + '%'
      },
      latency: {
        min: latency.min ? latency.min.toFixed(2) : 'N/A',
        max: latency.max ? latency.max.toFixed(2) : 'N/A',
        mean: latency.mean ? latency.mean.toFixed(2) : 'N/A',
        median: latency.median ? latency.median.toFixed(2) : 'N/A',
        p95: latency.p95 ? latency.p95.toFixed(2) : 'N/A',
        p99: latency.p99 ? latency.p99.toFixed(2) : 'N/A'
      },
      throughput: {
        mean: summary.rps?.mean ? summary.rps.mean.toFixed(2) : 'N/A',
        min: summary.rps?.min ? summary.rps.min.toFixed(2) : 'N/A',
        max: summary.rps?.max ? summary.rps.max.toFixed(2) : 'N/A'
      },
      statusCodes: data.aggregate.httpStatusCodeDistribution || {}
    };

    const summaryPath = path.join(this.resultsDir, 
      testResultsFile.replace('.json', '-summary.json'));
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    
    console.log(`✓ Summary JSON saved: ${summaryPath}`);
    return summaryPath;
  }
}

// Main execution
if (require.main === module) {
  const resultsDir = process.argv[2] || './test-results';
  const reporter = new LoadTestReporter(resultsDir);

  // Find latest JSON results file
  const files = fs.readdirSync(resultsDir);
  const latestJson = files
    .filter(f => f.endsWith('.json') && !f.includes('metrics') && !f.includes('summary'))
    .sort()
    .pop();

  if (latestJson) {
    console.log(`Processing: ${latestJson}\n`);
    reporter.generateHTMLReport(latestJson);
    reporter.generateSummaryJSON(latestJson);
  } else {
    console.log('No JSON results files found');
  }
}

module.exports = LoadTestReporter;
