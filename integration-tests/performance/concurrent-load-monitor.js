/**
 * Concurrent User Load Test - Real-time Metrics Monitor
 * Monitors system performance metrics during load testing
 */

const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');

class ConcurrentLoadMonitor {
  constructor(metricsOutputPath = './test-results/metrics.json') {
    this.metricsOutputPath = metricsOutputPath;
    this.metrics = {
      startTime: Date.now(),
      samples: [],
      systemMetrics: []
    };
    this.monitoringInterval = null;
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const sample = {
      timestamp: Date.now(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      systemLoadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      uptime: os.uptime(),
      platform: os.platform(),
      cpuCount: os.cpus().length
    };
    
    return sample;
  }

  /**
   * Query backend metrics endpoint
   */
  async queryBackendMetrics(backendUrl = 'http://localhost:5000') {
    return new Promise((resolve) => {
      const metricsUrl = new URL('/metrics', backendUrl);
      
      const req = http.get(metricsUrl, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(this.parseMetrics(data));
        });
      });
      
      req.on('error', (error) => {
        console.warn(`Failed to query backend metrics: ${error.message}`);
        resolve(null);
      });
      
      req.setTimeout(5000);
    });
  }

  /**
   * Parse Prometheus-format metrics
   */
  parseMetrics(metricsData) {
    const metrics = {};
    
    if (!metricsData) return metrics;
    
    const lines = metricsData.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      const match = line.match(/^(.+?)\s+(.+)$/);
      if (match) {
        const [, key, value] = match;
        metrics[key] = parseFloat(value) || value;
      }
    }
    
    return metrics;
  }

  /**
   * Report memory usage
   */
  reportMemoryMetrics(memUsage) {
    return {
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
      externalMB: (memUsage.external / 1024 / 1024).toFixed(2),
      rssUsageMB: (memUsage.rss / 1024 / 1024).toFixed(2),
      heapUtilization: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring(interval = 5000, backendUrl = 'http://localhost:5000') {
    console.log('Starting concurrent load test monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      const systemMetrics = this.collectSystemMetrics();
      const systemMetricsReport = {
        timestamp: new Date(systemMetrics.timestamp).toISOString(),
        cpuUser: systemMetrics.cpuUsage.user,
        cpuSystem: systemMetrics.cpuUsage.system,
        memory: this.reportMemoryMetrics(systemMetrics.memoryUsage),
        loadAverage: {
          '1min': systemMetrics.systemLoadAverage[0].toFixed(2),
          '5min': systemMetrics.systemLoadAverage[1].toFixed(2),
          '15min': systemMetrics.systemLoadAverage[2].toFixed(2)
        },
        systemMemoryMB: {
          free: (systemMetrics.freeMemory / 1024 / 1024).toFixed(2),
          total: (systemMetrics.totalMemory / 1024 / 1024).toFixed(2)
        }
      };

      this.metrics.systemMetrics.push(systemMetricsReport);
      
      // Query backend metrics
      const backendMetrics = await this.queryBackendMetrics(backendUrl);
      if (backendMetrics) {
        this.metrics.samples.push({
          timestamp: new Date().toISOString(),
          systemMetrics: systemMetricsReport,
          backendMetrics: backendMetrics
        });
      }
      
      // Log current state
      this.logCurrentMetrics(systemMetricsReport, backendMetrics);
    }, interval);
  }

  /**
   * Log metrics to console
   */
  logCurrentMetrics(systemMetrics, backendMetrics) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 METRICS UPDATE: ${systemMetrics.timestamp}`);
    console.log('='.repeat(80));
    
    console.log('💾 MEMORY:');
    console.log(`  • Heap Used: ${systemMetrics.memory.heapUsedMB}MB / ${systemMetrics.memory.heapTotalMB}MB (${systemMetrics.memory.heapUtilization})`);
    console.log(`  • RSS Memory: ${systemMetrics.memory.rssUsageMB}MB`);
    console.log(`  • System Free: ${systemMetrics.systemMemoryMB.free}MB / ${systemMetrics.systemMemoryMB.total}MB`);
    
    console.log('⚙️  CPU:');
    console.log(`  • User CPU: ${systemMetrics.cpuUser}μs`);
    console.log(`  • System CPU: ${systemMetrics.cpuSystem}μs`);
    console.log(`  • Load Average (1/5/15 min): ${systemMetrics.loadAverage['1min']} / ${systemMetrics.loadAverage['5min']} / ${systemMetrics.loadAverage['15min']}`);
    
    if (backendMetrics) {
      console.log('🔌 BACKEND METRICS:');
      const displayMetrics = Object.entries(backendMetrics)
        .slice(0, 10)
        .map(([key, value]) => `  • ${key}: ${value}`);
      console.log(displayMetrics.join('\n'));
    }
    
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Stop monitoring and generate report
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('Monitoring stopped.');
    }

    this.metrics.endTime = Date.now();
    this.metrics.duration = ((this.metrics.endTime - this.metrics.startTime) / 1000).toFixed(2);
    
    this.saveMetrics();
    this.generateMetricsReport();
  }

  /**
   * Save metrics to file
   */
  saveMetrics() {
    const dir = path.dirname(this.metricsOutputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.metricsOutputPath, JSON.stringify(this.metrics, null, 2));
    console.log(`✅ Metrics saved to: ${this.metricsOutputPath}`);
  }

  /**
   * Generate metrics report
   */
  generateMetricsReport() {
    if (this.metrics.systemMetrics.length === 0) {
      console.log('No metrics collected.');
      return;
    }

    let report = '\n' + '='.repeat(80) + '\n';
    report += 'CONCURRENT LOAD TEST - SYSTEM METRICS REPORT\n';
    report += '='.repeat(80) + '\n\n';

    // Test duration
    report += `⏱️  TEST DURATION: ${this.metrics.duration}s\n`;
    report += `📊 SAMPLES COLLECTED: ${this.metrics.systemMetrics.length}\n\n`;

    // Memory statistics
    const memoryStats = this.calculateMemoryStats();
    report += '💾 MEMORY STATISTICS:\n';
    report += `  • Peak Heap Usage: ${memoryStats.peakHeapUsedMB}MB\n`;
    report += `  • Average Heap Usage: ${memoryStats.avgHeapUsedMB}MB\n`;
    report += `  • Peak RSS Memory: ${memoryStats.peakRssMB}MB\n`;
    report += `  • Average RSS Memory: ${memoryStats.avgRssMB}MB\n\n`;

    // CPU load statistics
    const cpuStats = this.calculateCpuStats();
    report += '⚙️  CPU LOAD STATISTICS:\n';
    report += `  • Peak 1-min Load: ${cpuStats.peak1minLoad}\n`;
    report += `  • Average 1-min Load: ${cpuStats.avg1minLoad}\n`;
    report += `  • Peak 5-min Load: ${cpuStats.peak5minLoad}\n`;
    report += `  • Peak 15-min Load: ${cpuStats.peak15minLoad}\n\n`;

    report += '='.repeat(80) + '\n';

    console.log(report);

    // Save report
    const reportPath = path.join(path.dirname(this.metricsOutputPath), 'concurrent-metrics-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report saved to: ${reportPath}\n`);
  }

  /**
   * Calculate memory statistics
   */
  calculateMemoryStats() {
    const memoryValues = this.metrics.systemMetrics.map(m => ({
      heapUsed: parseFloat(m.memory.heapUsedMB),
      rss: parseFloat(m.memory.rssUsageMB)
    }));

    return {
      peakHeapUsedMB: Math.max(...memoryValues.map(m => m.heapUsed)).toFixed(2),
      avgHeapUsedMB: (memoryValues.reduce((sum, m) => sum + m.heapUsed, 0) / memoryValues.length).toFixed(2),
      peakRssMB: Math.max(...memoryValues.map(m => m.rss)).toFixed(2),
      avgRssMB: (memoryValues.reduce((sum, m) => sum + m.rss, 0) / memoryValues.length).toFixed(2)
    };
  }

  /**
   * Calculate CPU statistics
   */
  calculateCpuStats() {
    const loadValues = this.metrics.systemMetrics.map(m => ({
      load1: parseFloat(m.loadAverage['1min']),
      load5: parseFloat(m.loadAverage['5min']),
      load15: parseFloat(m.loadAverage['15min'])
    }));

    return {
      peak1minLoad: Math.max(...loadValues.map(l => l.load1)).toFixed(2),
      avg1minLoad: (loadValues.reduce((sum, l) => sum + l.load1, 0) / loadValues.length).toFixed(2),
      peak5minLoad: Math.max(...loadValues.map(l => l.load5)).toFixed(2),
      peak15minLoad: Math.max(...loadValues.map(l => l.load15)).toFixed(2)
    };
  }
}

// Export for use as module
module.exports = ConcurrentLoadMonitor;

// Main execution for standalone monitoring
if (require.main === module) {
  const monitor = new ConcurrentLoadMonitor();
  const backendUrl = process.argv[2] || 'http://localhost:5000';
  const intervalMs = parseInt(process.argv[3]) || 5000;

  monitor.startMonitoring(intervalMs, backendUrl);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  });
}
