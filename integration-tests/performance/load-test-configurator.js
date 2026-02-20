/**
 * Concurrent User Load Test Configuration Guide
 * Helper to configure and customize load tests
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class LoadTestConfigurator {
  constructor() {
    this.config = {
      backend: {
        url: 'http://localhost:5000',
        timeout: 30000
      },
      artillery: {
        enabled: true,
        phases: [
          { duration: 60, arrivalRate: 5, name: 'Warm up' },
          { duration: 120, arrivalRate: 25, name: 'Ramp up' },
          { duration: 180, arrivalRate: 50, name: 'Sustained' },
          { duration: 240, arrivalRate: 100, name: 'Peak' }
        ]
      },
      locust: {
        enabled: true,
        users: 100,
        spawnRate: 3,
        duration: 300
      },
      monitoring: {
        enabled: true,
        interval: 5000
      },
      sla: {
        avgLatency: 500,
        p99Latency: 2000,
        errorRate: 1.0,
        throughput: 100
      }
    };
  }

  /**
   * Interactive configuration wizard
   */
  async wizard() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => {
      return new Promise((resolve) => {
        rl.question(query, resolve);
      });
    };

    console.log('\n🔧 Load Test Configuration Wizard\n');

    // Backend configuration
    console.log('--- Backend Configuration ---');
    this.config.backend.url = await question(
      `Backend URL (${this.config.backend.url}): `
    ) || this.config.backend.url;

    // Test selection
    console.log('\n--- Test Selection ---');
    const runArtillery = await question('Enable Artillery tests? (y/n) [y]: ');
    this.config.artillery.enabled = runArtillery !== 'n';

    const runLocust = await question('Enable Locust tests? (y/n) [y]: ');
    this.config.locust.enabled = runLocust !== 'n';

    // Load profile
    if (this.config.artillery.enabled) {
      console.log('\n--- Artillery Load Profile ---');
      const peakUsers = await question('Peak concurrent users (100): ');
      this.config.artillery.phases[3].arrivalRate = parseInt(peakUsers) || 100;
    }

    if (this.config.locust.enabled) {
      console.log('\n--- Locust Load Profile ---');
      const users = await question('Number of users (100): ');
      this.config.locust.users = parseInt(users) || 100;

      const spawnRate = await question('Spawn rate users/sec (3): ');
      this.config.locust.spawnRate = parseInt(spawnRate) || 3;

      const duration = await question('Test duration seconds (300): ');
      this.config.locust.duration = parseInt(duration) || 300;
    }

    // SLA configuration
    console.log('\n--- SLA Configuration ---');
    const avgLatency = await question(`Average latency threshold ms (${this.config.sla.avgLatency}): `);
    this.config.sla.avgLatency = parseInt(avgLatency) || 500;

    const p99Latency = await question(`P99 latency threshold ms (${this.config.sla.p99Latency}): `);
    this.config.sla.p99Latency = parseInt(p99Latency) || 2000;

    const errorRate = await question(`Error rate threshold % (${this.config.sla.errorRate}): `);
    this.config.sla.errorRate = parseFloat(errorRate) || 1.0;

    const throughput = await question(`Minimum throughput req/s (${this.config.sla.throughput}): `);
    this.config.sla.throughput = parseInt(throughput) || 100;

    rl.close();

    // Save configuration
    this.saveConfig();
    this.printSummary();
  }

  /**
   * Load configuration from file
   */
  loadConfig(filePath = 'load-test-config.json') {
    try {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath, 'utf8');
        this.config = JSON.parse(data);
        console.log(`✓ Configuration loaded from ${filePath}`);
        return this.config;
      }
    } catch (error) {
      console.warn(`Warning: Could not load config: ${error.message}`);
    }
    return this.config;
  }

  /**
   * Save configuration to file
   */
  saveConfig(filePath = 'load-test-config.json') {
    try {
      const fullPath = path.join(__dirname, filePath);
      fs.writeFileSync(fullPath, JSON.stringify(this.config, null, 2));
      console.log(`\n✓ Configuration saved to ${filePath}`);
    } catch (error) {
      console.error(`Could not save config: ${error.message}`);
    }
  }

  /**
   * Print configuration summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 CONFIGURATION SUMMARY');
    console.log('='.repeat(60) + '\n');

    console.log('🌐 Backend:');
    console.log(`  • URL: ${this.config.backend.url}`);
    console.log(`  • Timeout: ${this.config.backend.timeout}ms\n`);

    if (this.config.artillery.enabled) {
      console.log('📊 Artillery Tests: ENABLED');
      console.log('  Phases:');
      for (const phase of this.config.artillery.phases) {
        console.log(`    • ${phase.name}: ${phase.arrivalRate} users/sec for ${phase.duration}s`);
      }
    } else {
      console.log('📊 Artillery Tests: DISABLED');
    }

    console.log();
    if (this.config.locust.enabled) {
      console.log('🐛 Locust Tests: ENABLED');
      console.log(`  • Users: ${this.config.locust.users}`);
      console.log(`  • Spawn Rate: ${this.config.locust.spawnRate} users/sec`);
      console.log(`  • Duration: ${this.config.locust.duration}s`);
    } else {
      console.log('🐛 Locust Tests: DISABLED');
    }

    console.log('\n📈 SLA Thresholds:');
    console.log(`  • Avg Latency: ${this.config.sla.avgLatency}ms`);
    console.log(`  • P99 Latency: ${this.config.sla.p99Latency}ms`);
    console.log(`  • Error Rate: ${this.config.sla.errorRate}%`);
    console.log(`  • Min Throughput: ${this.config.sla.throughput} req/s`);

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Generate command for running tests
   */
  generateCommand(testMode = 'all') {
    let command = './run-concurrent-load-tests.sh --' + testMode;
    
    if (this.config.backend.url !== 'http://localhost:5000') {
      command = `LOAD_TEST_URL="${this.config.backend.url}" ${command}`;
    }

    return command;
  }

  /**
   * Export configuration as environment variables script
   */
  exportEnvScript(filePath = 'load-test-env.sh') {
    const script = `#!/bin/bash
# Load Test Configuration Environment Variables
export LOAD_TEST_URL="${this.config.backend.url}"
export LOAD_TEST_TIMEOUT="${this.config.backend.timeout}"
export ARTILLERY_ENABLED="${this.config.artillery.enabled}"
export LOCUST_ENABLED="${this.config.locust.enabled}"
export LOCUST_USERS="${this.config.locust.users}"
export LOCUST_SPAWN_RATE="${this.config.locust.spawnRate}"
export LOCUST_DURATION="${this.config.locust.duration}"
export SLA_AVG_LATENCY="${this.config.sla.avgLatency}"
export SLA_P99_LATENCY="${this.config.sla.p99Latency}"
export SLA_ERROR_RATE="${this.config.sla.errorRate}"
export SLA_THROUGHPUT="${this.config.sla.throughput}"
`;

    try {
      const fullPath = path.join(__dirname, filePath);
      fs.writeFileSync(fullPath, script);
      console.log(`✓ Environment script saved to ${filePath}`);
    } catch (error) {
      console.error(`Could not save env script: ${error.message}`);
    }
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (!this.config.backend.url) {
      errors.push('Backend URL is required');
    }

    if (this.config.sla.avgLatency <= 0) {
      errors.push('Average latency threshold must be positive');
    }

    if (this.config.sla.p99Latency <= 0) {
      errors.push('P99 latency threshold must be positive');
    }

    if (!this.config.artillery.enabled && !this.config.locust.enabled) {
      errors.push('At least one test framework must be enabled');
    }

    if (errors.length > 0) {
      console.error('\n❌ Configuration Validation Errors:\n');
      errors.forEach(err => console.error(`  • ${err}`));
      return false;
    }

    console.log('✅ Configuration is valid\n');
    return true;
  }
}

// Main execution for interactive wizard
if (require.main === module) {
  const configurator = new LoadTestConfigurator();
  
  const command = process.argv[2];
  
  if (command === '--wizard' || command === '-w') {
    configurator.wizard().then(() => {
      console.log('\n💡 To run tests with this configuration:');
      console.log(`   ${configurator.generateCommand()}\n`);
    });
  } else if (command === '--load') {
    configurator.loadConfig();
    configurator.printSummary();
  } else if (command === '--validate') {
    configurator.loadConfig();
    configurator.validate();
  } else if (command === '--export-env') {
    configurator.loadConfig();
    configurator.exportEnvScript();
  } else {
    console.log(`Usage: node load-test-configurator.js [COMMAND]
    
Commands:
  --wizard         Interactive configuration wizard
  --load           Load existing configuration
  --validate       Validate configuration
  --export-env     Export configuration as shell script
  
Examples:
  node load-test-configurator.js --wizard
  node load-test-configurator.js --validate
`);
  }
}

module.exports = LoadTestConfigurator;
