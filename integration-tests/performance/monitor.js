#!/usr/bin/env node

/**
 * Content Delivery Performance Monitor
 * Real-time monitoring dashboard for content streaming performance
 */

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor(port = 3001) {
    this.app = express();
    this.port = port;
    this.metrics = {
      current: {},
      history: [],
      alerts: []
    };
    this.isMonitoring = false;
    this.monitoringInterval = null;

    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'dashboard')));

    // Dashboard route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
    });

    // Metrics API
    this.app.get('/api/metrics', (req, res) => {
      res.json(this.metrics);
    });

    // Start monitoring
    this.app.post('/api/monitor/start', (req, res) => {
      this.startMonitoring();
      res.json({ status: 'started' });
    });

    // Stop monitoring
    this.app.post('/api/monitor/stop', (req, res) => {
      this.stopMonitoring();
      res.json({ status: 'stopped' });
    });

    // Run performance test
    this.app.post('/api/test/run', async (req, res) => {
      const { testName } = req.body;
      try {
        await this.runPerformanceTest(testName);
        res.json({ status: 'completed' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get alerts
    this.app.get('/api/alerts', (req, res) => {
      res.json(this.metrics.alerts.slice(-10)); // Last 10 alerts
    });
  }

  async runPerformanceTest(testName) {
    const testFile = path.join(__dirname, `${testName}.yml`);
    const outputFile = path.join(__dirname, '..', 'test-results', `${testName}-report.json`);

    return new Promise((resolve, reject) => {
      const command = `artillery run ${testFile} --output ${outputFile}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          // Parse results and update metrics
          this.updateMetricsFromTest(testName, outputFile);
          resolve(stdout);
        }
      });
    });
  }

  updateMetricsFromTest(testName, reportFile) {
    try {
      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      const overall = report.aggregate;

      const metrics = {
        timestamp: new Date().toISOString(),
        testName,
        requests: overall.requestsCompleted,
        errors: overall.errorsEncountered,
        errorRate: (overall.errorsEncountered / overall.requestsCompleted) * 100,
        throughput: overall.rps.mean,
        latency: {
          mean: overall.latency.mean,
          p50: overall.latency.p50,
          p95: overall.latency.p95,
          p99: overall.latency.p99
        }
      };

      this.metrics.current = metrics;
      this.metrics.history.push(metrics);

      // Keep only last 100 entries
      if (this.metrics.history.length > 100) {
        this.metrics.history = this.metrics.history.slice(-100);
      }

      // Check for alerts
      this.checkAlerts(metrics);

    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  checkAlerts(metrics) {
    const alerts = [];

    if (metrics.errorRate > 5) {
      alerts.push({
        timestamp: new Date().toISOString(),
        level: 'CRITICAL',
        message: `High error rate: ${metrics.errorRate.toFixed(2)}%`,
        metric: 'errorRate',
        value: metrics.errorRate
      });
    } else if (metrics.errorRate > 2) {
      alerts.push({
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        message: `Elevated error rate: ${metrics.errorRate.toFixed(2)}%`,
        metric: 'errorRate',
        value: metrics.errorRate
      });
    }

    if (metrics.latency.p95 > 5000) {
      alerts.push({
        timestamp: new Date().toISOString(),
        level: 'CRITICAL',
        message: `High latency (P95): ${metrics.latency.p95.toFixed(0)}ms`,
        metric: 'latency',
        value: metrics.latency.p95
      });
    } else if (metrics.latency.p95 > 2000) {
      alerts.push({
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        message: `Elevated latency (P95): ${metrics.latency.p95.toFixed(0)}ms`,
        metric: 'latency',
        value: metrics.latency.p95
      });
    }

    if (metrics.throughput < 5) {
      alerts.push({
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        message: `Low throughput: ${metrics.throughput.toFixed(2)} req/sec`,
        metric: 'throughput',
        value: metrics.throughput
      });
    }

    this.metrics.alerts.push(...alerts);
  }

  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting performance monitoring...');

    // Run tests every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runPerformanceTest('content-delivery-load-test');
        console.log('✅ Performance test completed');
      } catch (error) {
        console.error('❌ Performance test failed:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Initial test
    this.runPerformanceTest('content-delivery-load-test');
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('⏹️  Performance monitoring stopped');
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`📊 Content Delivery Performance Monitor running on http://localhost:${this.port}`);
      console.log(`📈 Dashboard: http://localhost:${this.port}`);
      console.log(`🔧 API: http://localhost:${this.port}/api/metrics`);
    });
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new PerformanceMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down performance monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  });

  monitor.start();
}

module.exports = PerformanceMonitor;