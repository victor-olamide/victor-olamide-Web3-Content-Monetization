#!/usr/bin/env node

/**
 * Deployment Smoke Test Suite
 * Automated smoke tests to run after each deployment
 * Validates critical functionality in production-like environment
 */

const axios = require('axios');
const { expect } = require('chai');

class DeploymentSmokeTester {
  constructor(baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30 seconds
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTests() {
    console.log('🚀 Starting Deployment Smoke Tests...');
    console.log(`📍 Target URL: ${this.baseUrl}`);
    console.log('=' .repeat(50));

    try {
      await this.testHealthChecks();
      await this.testAuthentication();
      await this.testContentAccess();
      await this.testDatabaseConnectivity();
      await this.testExternalServices();
      await this.testPerformance();

      this.printSummary();
      return this.results.failed === 0;

    } catch (error) {
      console.error('❌ Smoke test suite failed:', error.message);
      this.printSummary();
      return false;
    }
  }

  async testHealthChecks() {
    console.log('\n🏥 Testing Health Checks...');

    await this.runTest('Health endpoint responds', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: this.timeout
      });
      expect(response.status).to.equal(200);
      expect(response.data.status).to.equal('ok');
      expect(response.data.timestamp).to.be.a('string');
    });

    await this.runTest('Database health check', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health/database`, {
        timeout: this.timeout
      });
      expect(response.status).to.equal(200);
      expect(response.data.database).to.equal('connected');
    });

    await this.runTest('Application info endpoint', async () => {
      const response = await axios.get(`${this.baseUrl}/api/info`, {
        timeout: this.timeout
      });
      expect(response.status).to.equal(200);
      expect(response.data.version).to.be.a('string');
    });
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');

    await this.runTest('Login endpoint accessible', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpass'
      }, {
        timeout: this.timeout,
        validateStatus: () => true // Accept any status
      });
      // Should return 401 for invalid credentials, not 404 or 500
      expect([400, 401, 422]).to.include(response.status);
    });

    await this.runTest('Registration endpoint accessible', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
        email: 'test@example.com',
        password: 'testpass123',
        username: 'testuser'
      }, {
        timeout: this.timeout,
        validateStatus: () => true
      });
      // Should return validation error or success, not 404 or 500
      expect([200, 201, 400, 409]).to.include(response.status);
    });
  }

  async testContentAccess() {
    console.log('\n📚 Testing Content Access...');

    await this.runTest('Public content listing', async () => {
      const response = await axios.get(`${this.baseUrl}/api/content`, {
        timeout: this.timeout
      });
      expect(response.status).to.equal(200);
      expect(Array.isArray(response.data.data)).to.be.true;
    });

    await this.runTest('Content search endpoint', async () => {
      const response = await axios.get(`${this.baseUrl}/api/content/search?q=test`, {
        timeout: this.timeout
      });
      expect([200, 404]).to.include(response.status); // 404 if no results, but endpoint works
    });

    await this.runTest('Content categories endpoint', async () => {
      const response = await axios.get(`${this.baseUrl}/api/content/categories`, {
        timeout: this.timeout
      });
      expect([200, 404]).to.include(response.status);
    });
  }

  async testDatabaseConnectivity() {
    console.log('\n🗄️  Testing Database Connectivity...');

    await this.runTest('Database connection status', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health/database`, {
        timeout: this.timeout
      });
      expect(response.status).to.equal(200);
      expect(response.data.database).to.equal('connected');
    });

    await this.runTest('Database migration status', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health/migrations`, {
        timeout: this.timeout,
        validateStatus: () => true
      });
      // Should not be 500 error
      expect(response.status).to.not.equal(500);
    });
  }

  async testExternalServices() {
    console.log('\n🌐 Testing External Services...');

    await this.runTest('CDN connectivity', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health/cdn`, {
        timeout: this.timeout,
        validateStatus: () => true
      });
      expect([200, 503]).to.include(response.status); // 503 if CDN down, but endpoint works
    });

    await this.runTest('Blockchain connectivity', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health/blockchain`, {
        timeout: this.timeout,
        validateStatus: () => true
      });
      expect([200, 503]).to.include(response.status);
    });

    await this.runTest('Email service status', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health/email`, {
        timeout: this.timeout,
        validateStatus: () => true
      });
      expect([200, 503]).to.include(response.status);
    });
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');

    await this.runTest('Response time under 2 seconds', async () => {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: this.timeout
      });
      const responseTime = Date.now() - startTime;

      expect(response.status).to.equal(200);
      expect(responseTime).to.be.lessThan(2000);
    });

    await this.runTest('Concurrent requests handling', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          axios.get(`${this.baseUrl}/api/health`, { timeout: this.timeout })
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });
    });
  }

  async runTest(testName, testFunction) {
    try {
      await testFunction();
      console.log(`  ✅ ${testName}`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`  ❌ ${testName}: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests.filter(test => test.status === 'FAILED').forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }

    const overallStatus = this.results.failed === 0 ? '✅ DEPLOYMENT READY' : '❌ DEPLOYMENT BLOCKED';
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const healthOnly = args.includes('--health-only');

  const tester = new DeploymentSmokeTester();

  if (healthOnly) {
    // Run only health checks
    tester.runTests = async () => {
      console.log('🏥 Running Health Checks Only...');
      console.log(`📍 Target URL: ${tester.baseUrl}`);
      console.log('='.repeat(50));

      try {
        await tester.testHealthChecks();
        tester.printSummary();
        return tester.results.failed === 0;
      } catch (error) {
        console.error('❌ Health checks failed:', error.message);
        tester.printSummary();
        return false;
      }
    };
  }

  const success = tester.runTests();
  process.exit(success ? 0 : 1);
}

module.exports = DeploymentSmokeTester;