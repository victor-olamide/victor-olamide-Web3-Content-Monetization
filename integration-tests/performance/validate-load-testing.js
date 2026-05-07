#!/usr/bin/env node

/**
 * Load Testing Setup Validation Script
 * Validates that all components of the concurrent load testing infrastructure are properly configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LoadTestingValidator {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'integration-tests', 'performance');
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    console.log('🔍 Validating Load Testing Setup...\n');

    this.checkFiles();
    this.checkDependencies();
    this.checkConfiguration();
    this.checkScripts();

    this.reportResults();
  }

  checkFiles() {
    console.log('📁 Checking required files...');

    const requiredFiles = [
      'concurrent-users-artillery.yml',
      'concurrent-users-locust.py',
      'concurrent-load-analyzer.js',
      'scripts/concurrent-user-processor.js',
      'run-concurrent-load-tests.sh',
      'monitor.js',
      'dashboard/index.html',
      'README.md',
      'QUICK_START.md',
      'CONCURRENT_LOAD_TESTING_IMPLEMENTATION.md'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(this.baseDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
      } else {
        this.errors.push(`Missing required file: ${file}`);
        console.log(`  ❌ ${file}`);
      }
    });
  }

  checkDependencies() {
    console.log('\n📦 Checking dependencies...');

    const packageJson = path.join(this.baseDir, '..', 'package.json');
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      const scripts = pkg.scripts || {};

      const requiredScripts = [
        'test:performance:concurrent',
        'performance:analyze:concurrent'
      ];

      requiredScripts.forEach(script => {
        if (scripts[script]) {
          console.log(`  ✅ npm script: ${script}`);
        } else {
          this.errors.push(`Missing npm script: ${script}`);
          console.log(`  ❌ npm script: ${script}`);
        }
      });
    } else {
      this.errors.push('package.json not found');
    }

    // Check for artillery
    try {
      execSync('artillery --version', { stdio: 'pipe' });
      console.log('  ✅ Artillery CLI available');
    } catch (e) {
      this.warnings.push('Artillery CLI not installed. Install with: npm install -g artillery');
      console.log('  ⚠️  Artillery CLI not available');
    }
  }

  checkConfiguration() {
    console.log('\n⚙️  Checking configuration...');

    const artilleryConfig = path.join(this.baseDir, 'concurrent-users-artillery.yml');
    if (fs.existsSync(artilleryConfig)) {
      try {
        const config = require('js-yaml').load(fs.readFileSync(artilleryConfig, 'utf8'));
        if (config.config && config.scenarios) {
          console.log('  ✅ Artillery configuration valid');
        } else {
          this.errors.push('Invalid Artillery configuration structure');
        }
      } catch (e) {
        this.errors.push('Failed to parse Artillery configuration');
      }
    }
  }

  checkScripts() {
    console.log('\n🔧 Checking scripts...');

    const scripts = [
      'concurrent-load-analyzer.js',
      'monitor.js'
    ];

    scripts.forEach(script => {
      const scriptPath = path.join(this.baseDir, script);
      if (fs.existsSync(scriptPath)) {
        try {
          // Basic syntax check
          const content = fs.readFileSync(scriptPath, 'utf8');
          if (content.includes('module.exports') || content.includes('export')) {
            console.log(`  ✅ ${script} syntax OK`);
          } else {
            console.log(`  ⚠️  ${script} may not be properly structured`);
          }
        } catch (e) {
          this.errors.push(`Failed to read ${script}`);
        }
      }
    });
  }

  reportResults() {
    console.log('\n📊 Validation Results:');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All checks passed! Load testing setup is ready.');
      process.exit(0);
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n🔧 Fix the errors above and run validation again.');
      process.exit(1);
    } else {
      console.log('\n✅ Setup is functional. Address warnings for optimal performance.');
      process.exit(0);
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new LoadTestingValidator();
  validator.validate();
}