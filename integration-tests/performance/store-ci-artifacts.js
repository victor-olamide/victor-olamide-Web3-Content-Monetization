#!/usr/bin/env node

/**
 * CI Artifact Storage Script
 * Stores load test results and baselines as CI artifacts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_DIR = path.join(__dirname, 'test-results');
const ARTIFACTS_DIR = path.join(__dirname, 'ci-artifacts');
const BASELINE_FILE = path.join(RESULTS_DIR, 'baseline.json');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

/**
 * Store test results as CI artifacts
 */
function storeArtifacts() {
  console.log('Storing load test results as CI artifacts...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactPrefix = `load-test-${timestamp}`;

  // Store Artillery results
  const artilleryResults = path.join(RESULTS_DIR, 'concurrent-users-artillery-results.json');
  if (fs.existsSync(artilleryResults)) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${artifactPrefix}-artillery.json`);
    fs.copyFileSync(artilleryResults, artifactPath);
    console.log(`✓ Artillery results stored: ${artifactPath}`);
  }

  // Store Locust results (if available)
  const locustResults = path.join(RESULTS_DIR, 'concurrent-users-locust-results.csv');
  if (fs.existsSync(locustResults)) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${artifactPrefix}-locust.csv`);
    fs.copyFileSync(locustResults, artifactPath);
    console.log(`✓ Locust results stored: ${artifactPath}`);
  }

  // Store baseline
  if (fs.existsSync(BASELINE_FILE)) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${artifactPrefix}-baseline.json`);
    fs.copyFileSync(BASELINE_FILE, artifactPath);
    console.log(`✓ Baseline stored: ${artifactPath}`);
  }

  // Store performance summary
  const summaryPath = path.join(RESULTS_DIR, 'performance-summary.json');
  if (fs.existsSync(summaryPath)) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${artifactPrefix}-summary.json`);
    fs.copyFileSync(summaryPath, artifactPath);
    console.log(`✓ Performance summary stored: ${artifactPath}`);
  }

  // Create artifact manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    testType: 'concurrent-users-load-test',
    artifacts: fs.readdirSync(ARTIFACTS_DIR).filter(f => f.startsWith(artifactPrefix)),
    metadata: {
      artilleryResults: fs.existsSync(artilleryResults),
      locustResults: fs.existsSync(locustResults),
      baseline: fs.existsSync(BASELINE_FILE),
      summary: fs.existsSync(summaryPath)
    }
  };

  const manifestPath = path.join(ARTIFACTS_DIR, `${artifactPrefix}-manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Artifact manifest created: ${manifestPath}`);

  // Set CI environment variables for artifact paths
  if (process.env.CI) {
    console.log(`::set-output name=artifacts-path::${ARTIFACTS_DIR}`);
    console.log(`::set-output name=manifest-path::${manifestPath}`);
  }

  console.log(`\nAll artifacts stored in: ${ARTIFACTS_DIR}`);
  console.log(`Total artifacts: ${manifest.artifacts.length}`);
}

/**
 * Validate stored artifacts
 */
function validateArtifacts() {
  console.log('\nValidating stored artifacts...');

  const artifacts = fs.readdirSync(ARTIFACTS_DIR);
  let validCount = 0;

  for (const artifact of artifacts) {
    const artifactPath = path.join(ARTIFACTS_DIR, artifact);

    try {
      const stats = fs.statSync(artifactPath);
      if (stats.size > 0) {
        console.log(`✓ ${artifact} (${stats.size} bytes)`);
        validCount++;
      } else {
        console.log(`⚠️ ${artifact} is empty`);
      }
    } catch (error) {
      console.log(`❌ ${artifact} validation failed: ${error.message}`);
    }
  }

  console.log(`\nValidation complete: ${validCount}/${artifacts.length} artifacts valid`);

  if (validCount === 0) {
    console.error('No valid artifacts found!');
    process.exit(1);
  }
}

/**
 * Clean up old artifacts (keep last 10)
 */
function cleanupOldArtifacts() {
  console.log('\nCleaning up old artifacts...');

  const artifacts = fs.readdirSync(ARTIFACTS_DIR)
    .map(file => ({
      name: file,
      path: path.join(ARTIFACTS_DIR, file),
      mtime: fs.statSync(path.join(ARTIFACTS_DIR, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (artifacts.length > 10) {
    const toDelete = artifacts.slice(10);
    for (const artifact of toDelete) {
      fs.unlinkSync(artifact.path);
      console.log(`✓ Deleted old artifact: ${artifact.name}`);
    }
  }

  console.log(`Kept ${Math.min(artifacts.length, 10)} most recent artifacts`);
}

// Main execution
if (require.main === module) {
  try {
    storeArtifacts();
    validateArtifacts();
    cleanupOldArtifacts();

    console.log('\n🎉 CI artifact storage completed successfully!');
  } catch (error) {
    console.error('❌ CI artifact storage failed:', error.message);
    process.exit(1);
  }
}

module.exports = { storeArtifacts, validateArtifacts, cleanupOldArtifacts };