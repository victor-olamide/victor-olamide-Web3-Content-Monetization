#!/usr/bin/env node

'use strict';

/**
 * Deployment Smoke Test Suite (#195)
 * Validates: health check, auth endpoints, content API, database connectivity.
 * Blocks deployment on critical failures.
 */

const axios = require('axios');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DeploymentSmokeTester {
  constructor(
    baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:5000',
    environment = process.env.NODE_ENV || 'development'
  ) {
    this.baseUrl = baseUrl;
    this.environment = environment;
    this.config = this.loadConfig();
    this.timeout = this.config.environments[environment]?.timeout || 30000;
    this.results = { passed: 0, failed: 0, skipped: 0, tests: [] };
  }

  loadConfig() {
    const configPath = path.join(__dirname, 'deployment-config.yml');
    if (fs.existsSync(configPath)) {
      return yaml.load(fs.readFileSync(configPath, 'utf8'));
    }
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      environments: {
        development: { timeout: 30000, retries: 3 },
        staging:     { timeout: 45000, retries: 5 },
        production:  { timeout: 60000, retries: 5 },
      },
      tests: {
        health_checks:        { enabled: true,  critical: true  },
        authentication:       { enabled: true,  critical: true  },
        content_api:          { enabled: true,  critical: true  },
        database_connectivity:{ enabled: true,  critical: true  },
        external_services:    { enabled: true,  critical: false },
        performance:          { enabled: true,  critical: false },
      },
    };
  }

  // ─── runner ────────────────────────────────────────────────────────────────

  async runTests() {
    console.log('\n🚀 Starting Deployment Smoke Tests...');
    console.log(`📍 Target URL:  ${this.baseUrl}`);
    console.log(`🌍 Environment: ${this.environment}`);
    console.log('='.repeat(60));

    try {
      const cfg = this.config.tests;

      if (cfg.health_checks?.enabled)         await this.testHealthChecks();
      if (cfg.authentication?.enabled)         await this.testAuthentication();
      if (cfg.content_api?.enabled)            await this.testContentAPI();
      if (cfg.database_connectivity?.enabled)  await this.testDatabaseConnectivity();
      if (cfg.external_services?.enabled)      await this.testExternalServices();
      if (cfg.performance?.enabled)            await this.testPerformance();

      this.printSummary();
      return this.isDeploymentReady();
    } catch (err) {
      console.error('❌ Smoke test suite encountered an unexpected error:', err.message);
      this.printSummary();
      return false;
    }
  }

  isDeploymentReady() {
    const criticalFailures = this.results.tests.filter(
      t => t.status === 'FAILED' && t.critical
    ).length;
    return criticalFailures === 0;
  }

  // ─── health checks ─────────────────────────────────────────────────────────

  async testHealthChecks() {
    console.log('\n🏥 Testing Health Checks...');
    const critical = this.config.tests.health_checks?.critical ?? true;

    await this.runTest('Health endpoint returns 200 with healthy status', async () => {
      const res = await this.get('/health');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('status', 'healthy');
      expect(res.data).to.have.property('timestamp').that.is.a('string');
    }, critical);

    await this.runTest('Health endpoint includes uptime', async () => {
      const res = await this.get('/health');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('uptime').that.is.a('number');
    }, critical);

    await this.runTest('Database health check returns 200 with connected status', async () => {
      const res = await this.get('/health/database');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('status', 'connected');
    }, critical);

    await this.runTest('Database health check identifies database type', async () => {
      const res = await this.get('/health/database');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('database', 'mongodb');
    }, critical);

    await this.runTest('Metrics endpoint returns Prometheus text format', async () => {
      const res = await this.get('/metrics');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('text/plain');
    }, false);
  }

  // ─── auth endpoints ─────────────────────────────────────────────────────────

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication Endpoints...');
    const critical = this.config.tests.authentication?.critical ?? true;

    await this.runTest('Login endpoint is reachable (returns 4xx, not 404/500)', async () => {
      const res = await this.post('/api/auth/login', {
        email: 'smoke-test@example.com',
        password: 'invalid-password',
      });
      expect([400, 401, 422]).to.include(res.status);
    }, critical);

    await this.runTest('Registration endpoint is reachable (returns 2xx/4xx, not 404/500)', async () => {
      const res = await this.post('/api/auth/register', {
        email: `smoke-${Date.now()}@example.com`,
        password: 'SmokeTest123!',
        username: `smokeuser${Date.now()}`,
      });
      expect([200, 201, 400, 409, 422]).to.include(res.status);
    }, critical);

    await this.runTest('Auth endpoint returns JSON on invalid credentials', async () => {
      const res = await this.post('/api/auth/login', {
        email: 'smoke-test@example.com',
        password: 'wrongpassword',
      });
      expect(res.headers['content-type']).to.include('application/json');
      expect(res.data).to.be.an('object');
    }, critical);

    await this.runTest('Protected route rejects unauthenticated request with 401', async () => {
      const res = await this.get('/api/auth/me');
      expect([401, 403]).to.include(res.status);
    }, critical);
  }

  // ─── content API ───────────────────────────────────────────────────────────

  async testContentAPI() {
    console.log('\n📚 Testing Content API...');
    const critical = this.config.tests.content_api?.critical ?? true;

    await this.runTest('Public content listing returns 200 with array payload', async () => {
      const res = await this.get('/api/content');
      expect(res.status).to.equal(200);
      const items = res.data?.data ?? res.data;
      expect(Array.isArray(items)).to.be.true;
    }, critical);

    await this.runTest('Content listing response is well-formed JSON', async () => {
      const res = await this.get('/api/content');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('application/json');
    }, critical);

    await this.runTest('Content search endpoint handles query param', async () => {
      const res = await this.get('/api/content?search=test');
      expect([200, 404]).to.include(res.status);
    }, critical);

    await this.runTest('Content endpoint responds within 3 seconds', async () => {
      const start = Date.now();
      await this.get('/api/content');
      expect(Date.now() - start).to.be.lessThan(3000);
    }, false);
  }

  // ─── database connectivity ─────────────────────────────────────────────────

  async testDatabaseConnectivity() {
    console.log('\n🗄️  Testing Database Connectivity...');
    const critical = this.config.tests.database_connectivity?.critical ?? true;

    await this.runTest('Database health endpoint returns connected status', async () => {
      const res = await this.get('/health/database');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('status', 'connected');
      expect(res.data).to.have.property('database', 'mongodb');
    }, critical);

    await this.runTest('Database status endpoint returns connection details', async () => {
      const res = await this.get('/health/database/status');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('connection');
      expect(res.data).to.have.property('health');
    }, critical);

    await this.runTest('Database status endpoint includes health info', async () => {
      const res = await this.get('/health/database/status');
      expect(res.status).to.equal(200);
      expect(res.data.health).to.be.an('object');
    }, critical);

    await this.runTest('Database status includes timestamp', async () => {
      const res = await this.get('/health/database/status');
      expect(res.status).to.equal(200);
      expect(res.data).to.have.property('timestamp').that.is.a('string');
    }, false);
  }

  // ─── external services ─────────────────────────────────────────────────────

  async testExternalServices() {
    console.log('\n🌐 Testing External Services...');
    const critical = this.config.tests.external_services?.critical ?? false;

    await this.runTest('Metrics endpoint is available', async () => {
      const res = await this.get('/metrics');
      expect(res.status).to.equal(200);
    }, critical);

    await this.runTest('Blockchain cache-stats endpoint exists (200 or 503)', async () => {
      const res = await this.get('/api/blockchain/cache/stats');
      expect([200, 503]).to.include(res.status);
    }, critical);
  }

  // ─── performance ───────────────────────────────────────────────────────────

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    const critical = this.config.tests.performance?.critical ?? false;
    const maxMs = this.config.tests.performance?.max_response_time || 2000;
    const concurrency = this.config.tests.performance?.concurrent_requests || 5;

    await this.runTest(`Health endpoint responds within ${maxMs}ms`, async () => {
      const start = Date.now();
      const res = await this.get('/health');
      expect(res.status).to.equal(200);
      expect(Date.now() - start).to.be.lessThan(maxMs);
    }, critical);

    await this.runTest(`Handles ${concurrency} concurrent requests to /health`, async () => {
      const requests = Array.from({ length: concurrency }, () => this.get('/health'));
      const responses = await Promise.all(requests);
      responses.forEach(r => expect(r.status).to.equal(200));
    }, critical);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  async get(endpoint) {
    return axios.get(`${this.baseUrl}${endpoint}`, {
      timeout: this.timeout,
      validateStatus: () => true,
    });
  }

  async post(endpoint, body) {
    return axios.post(`${this.baseUrl}${endpoint}`, body, {
      timeout: this.timeout,
      validateStatus: () => true,
    });
  }

  async runTest(name, fn, critical = true) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', critical });
    } catch (err) {
      console.log(`  ❌ ${name}: ${err.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: err.message, critical });
    }
  }

  printSummary() {
    const total = this.results.passed + this.results.failed;
    const rate  = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed:        ${this.results.passed}`);
    console.log(`❌ Failed:        ${this.results.failed}`);
    console.log(`⏭️  Skipped:       ${this.results.skipped}`);
    console.log(`📈 Success Rate:  ${rate}%`);

    const critFails = this.results.tests.filter(t => t.status === 'FAILED' && t.critical);
    const warnFails = this.results.tests.filter(t => t.status === 'FAILED' && !t.critical);

    if (critFails.length) {
      console.log('\n❌ CRITICAL FAILURES (deployment blocked):');
      critFails.forEach(t => console.log(`   • ${t.name}: ${t.error}`));
    }

    if (warnFails.length) {
      console.log('\n⚠️  NON-CRITICAL FAILURES (monitor, deployment allowed):');
      warnFails.forEach(t => console.log(`   • ${t.name}: ${t.error}`));
    }

    const status = this.isDeploymentReady() ? '✅ DEPLOYMENT READY' : '❌ DEPLOYMENT BLOCKED';
    console.log(`\n🎯 OVERALL STATUS: ${status}\n`);
  }
}

// ─── CLI entry-point ──────────────────────────────────────────────────────────

if (require.main === module) {
  const healthOnly = process.argv.includes('--health-only');
  const tester = new DeploymentSmokeTester();

  if (healthOnly) {
    (async () => {
      console.log('🏥 Running Health Checks Only...');
      console.log(`📍 Target URL: ${tester.baseUrl}`);
      console.log('='.repeat(60));
      try {
        await tester.testHealthChecks();
        tester.printSummary();
        process.exit(tester.results.failed === 0 ? 0 : 1);
      } catch (err) {
        console.error('❌ Health checks failed:', err.message);
        tester.printSummary();
        process.exit(1);
      }
    })();
  } else {
    tester.runTests().then(ready => process.exit(ready ? 0 : 1));
  }
}

module.exports = DeploymentSmokeTester;
