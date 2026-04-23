#!/usr/bin/env node

/**
 * Concurrent User Load Test Runner
 * Orchestrates load tests with various concurrent user scenarios
 * Includes baseline calculation and CI artifact storage
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BaselineCalculator = require('./baseline-calculator');

const TESTS_DIR = __dirname;
const RESULTS_DIR = path.join(TESTS_DIR, 'test-results');
const ARTIFACTS_DIR = path.join(TESTS_DIR, 'ci-artifacts');

// Ensure directories exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

/**
 * Calculate and store performance baselines
 */
async function calculateBaselines() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('CALCULATING PERFORMANCE BASELINES');
  console.log(`${'='.repeat(80)}`);

  const calculator = new BaselineCalculator(RESULTS_DIR);

  // Process Artillery results
  const artilleryResults = path.join(RESULTS_DIR, 'concurrent-users-artillery-results.json');
  if (fs.existsSync(artilleryResults)) {
    console.log('Processing Artillery results...');
    const success = calculator.setBaseline('concurrent-users-artillery-results.json');
    if (success) {
      console.log('✓ Artillery baseline established');
    }
  }

  // For Locust, we need to parse CSV results (Locust doesn't output JSON by default)
  // This is a simplified version - in production, you'd parse Locust's CSV output
  console.log('Note: Locust results parsing would require CSV output configuration');

  // Store baseline as CI artifact
  const baselinePath = path.join(RESULTS_DIR, 'baseline.json');
  const artifactPath = path.join(ARTIFACTS_DIR, `baseline-${Date.now()}.json`);

  if (fs.existsSync(baselinePath)) {
    fs.copyFileSync(baselinePath, artifactPath);
    console.log(`✓ Baseline stored as CI artifact: ${artifactPath}`);
  }

  return calculator;
}
function runArtilleryTest(configFile, outputFile, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${testName}`);
    console.log(`${'='.repeat(80)}`);
    
    const outputPath = path.join(RESULTS_DIR, outputFile);
    const args = [
      'run',
      configFile,
      '--output', outputPath,
      '--target', process.env.LOAD_TEST_URL || 'http://localhost:5000'
    ];
    
    const artillery = spawn('artillery', args, {
      cwd: TESTS_DIR,
      stdio: 'inherit'
    });
    
    artillery.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${testName} completed successfully`);
        resolve(outputPath);
      } else {
        reject(new Error(`${testName} failed with exit code ${code}`));
      }
    });
    
    artillery.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Run Locust load test
 */
function runLocustTest(pythonFile, numUsers, spawnRate, duration, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${testName}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Users: ${numUsers}, Spawn Rate: ${spawnRate}/sec, Duration: ${duration}s`);
    
    const args = [
      '-f', pythonFile,
      '-u', numUsers.toString(),
      '-r', spawnRate.toString(),
      '-t', `${duration}s`,
      '--headless'
    ];
    
    // Add host if provided
    if (process.env.LOAD_TEST_URL) {
      args.push('--host', process.env.LOAD_TEST_URL);
    }
    
    const locust = spawn('locust', args, {
      cwd: TESTS_DIR,
      stdio: 'inherit',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
    });
    
    locust.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${testName} completed successfully`);
        resolve();
      } else {
        reject(new Error(`${testName} failed with exit code ${code}`));
      }
    });
    
    locust.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Main test execution
 */
async function runAllTests() {
  const testMode = process.argv[2] || 'all';
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('CONCURRENT USER LOAD TEST SUITE');
  console.log(`Test Mode: ${testMode}`);
  console.log(`Start Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}`);
  
  const tests = {
    artillery: async () => {
      try {
        const configFile = 'concurrent-users-artillery.yml';
        const outputFile = 'concurrent-users-artillery-results.json';
        await runArtilleryTest(configFile, outputFile, 'Artillery Concurrent Users Test');
      } catch (error) {
        console.error('Artillery test failed:', error.message);
        if (testMode !== 'locust-only') throw error;
      }
    },
    
    locust: async () => {
      try {
        const pythonFile = 'concurrent-users-locust.py';
        // Gradual ramp: 10 users/sec for 300s, total up to 100 concurrent users
        await runLocustTest(pythonFile, 100, 3, 300, 'Locust Concurrent Users Test');
      } catch (error) {
        console.error('Locust test failed:', error.message);
        if (testMode !== 'artillery-only') throw error;
      }
    },
    
    stress: async () => {
      try {
        const pythonFile = 'concurrent-users-locust.py';
        // Stress test: rapid user increase to 500+
        await runLocustTest(pythonFile, 500, 5, 600, 'Locust Stress Test (500 Users)');
      } catch (error) {
        console.error('Stress test failed:', error.message);
        if (testMode !== 'artillery-only') throw error;
      }
    },
    
    soak: async () => {
      try {
        const pythonFile = 'concurrent-users-locust.py';
        // Soak test: sustained load for extended period
        await runLocustTest(pythonFile, 50, 2, 1800, 'Locust Soak Test (50 Users, 30 min)');
      } catch (error) {
        console.error('Soak test failed:', error.message);
        if (testMode !== 'artillery-only') throw error;
      }
    }
  };
  
  try {
    if (testMode === 'all') {
      await tests.artillery();
      await tests.locust();
      await tests.stress();
      await tests.soak();
    } else if (testMode === 'artillery-only') {
      await tests.artillery();
    } else if (testMode === 'locust-only') {
      await tests.locust();
    } else if (testMode === 'stress') {
      await tests.stress();
    } else if (testMode === 'soak') {
      await tests.soak();
    } else {
      throw new Error(`Unknown test mode: ${testMode}`);
    }
    
    // Calculate and store performance baselines
    await calculateBaselines();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(80)}`);
    console.log('ALL TESTS COMPLETED SUCCESSFULLY');
    console.log(`Total Duration: ${duration}s`);
    console.log(`Results Location: ${RESULTS_DIR}`);
    console.log(`CI Artifacts: ${ARTIFACTS_DIR}`);
    console.log(`${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error(`\nTest execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
