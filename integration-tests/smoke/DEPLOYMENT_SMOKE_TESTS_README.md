# Automated Deployment Smoke Tests

This document describes the automated smoke test suite that runs after each deployment to verify system health and functionality.

## Overview

The deployment smoke tests are designed to:
- Validate critical system functionality post-deployment
- Prevent deployment of broken or unstable releases
- Provide fast feedback on deployment success
- Support multiple environments (development, staging, production)

## Architecture

### Test Components

```
deployment-smoke-test.js      # Main test execution script
deployment-config.yml         # Environment and test configuration
run-deployment-smoke-tests.sh # CLI runner script
Dockerfile                    # Containerized execution
docker-compose.yml           # Orchestration for complex deployments
```

### Test Categories

#### 🔴 Critical Tests (Block Deployment)
- Health endpoint responsiveness
- Database connectivity
- Authentication endpoints
- Core API functionality

#### 🟡 Non-Critical Tests (Allow Deployment)
- External service connectivity
- Performance benchmarks
- Advanced features

## Configuration

### Environment Configuration

```yaml
environments:
  development:
    url: "http://localhost:5000"
    timeout: 30000
    retries: 3
    skip_external_services: true

  staging:
    url: "https://staging-api.example.com"
    timeout: 45000
    retries: 5
    skip_external_services: false

  production:
    url: "https://api.example.com"
    timeout: 60000
    retries: 5
    skip_external_services: false
```

### Test Configuration

```yaml
tests:
  health_checks:
    enabled: true
    timeout: 10000
    critical: true

  authentication:
    enabled: true
    timeout: 15000
    critical: true

  content_access:
    enabled: true
    timeout: 20000
    critical: true

  database_connectivity:
    enabled: true
    timeout: 10000
    critical: true

  external_services:
    enabled: true
    timeout: 30000
    critical: false

  performance:
    enabled: true
    timeout: 30000
    critical: true
```

## Usage

### Local Development

```bash
# Run all smoke tests
npm run test:smoke:deployment

# Run health checks only
npm run test:smoke:deployment -- --health-only

# Run with custom environment
DEPLOYMENT_URL=http://localhost:5000 NODE_ENV=development npm run test:smoke:deployment
```

### CLI Script

```bash
# Basic execution
./integration-tests/smoke/run-deployment-smoke-tests.sh

# Health checks only
./integration-tests/smoke/run-deployment-smoke-tests.sh --health-only

# Custom configuration
./integration-tests/smoke/run-deployment-smoke-tests.sh \
  --environment=staging \
  --url=https://staging-api.example.com \
  --timeout=45000 \
  --retries=5
```

### Docker Execution

```bash
# Build and run
docker build -f integration-tests/smoke/Dockerfile -t smoke-tests .
docker run --rm \
  -e DEPLOYMENT_URL=https://api.example.com \
  -e NODE_ENV=production \
  smoke-tests

# Using docker-compose
DEPLOYMENT_URL=https://api.example.com docker-compose \
  -f integration-tests/smoke/docker-compose.yml up smoke-tests
```

## CI/CD Integration

### GitHub Actions

The smoke tests are automatically triggered after deployments:

```yaml
- name: Run deployment smoke tests
  run: |
    npm run test:smoke:deployment
  env:
    DEPLOYMENT_URL: ${{ secrets.DEPLOYMENT_URL }}
    NODE_ENV: production
```

### Jenkins Pipeline

```groovy
stage('Smoke Tests') {
    steps {
        script {
            sh '''
                ./integration-tests/smoke/run-deployment-smoke-tests.sh \
                  --environment=production \
                  --url=${DEPLOYMENT_URL} \
                  --retries=3
            '''
        }
    }
}
```

### Deployment Status Updates

The tests update deployment status in GitHub:

- ✅ **Success**: Deployment marked as successful
- ❌ **Failure**: Deployment marked as failed
- ⚠️ **Partial**: Non-critical failures noted but deployment allowed

## Test Results

### Output Format

```
🚀 Starting Deployment Smoke Tests...
📍 Target URL: https://api.example.com
🌍 Environment: production
==================================================

🏥 Testing Health Checks...
  ✅ Health endpoint responds
  ✅ Database health check

📊 SMOKE TEST SUMMARY
==================================================
✅ Passed: 8
❌ Failed: 0
📈 Success Rate: 100.0%

🎯 OVERALL STATUS: ✅ DEPLOYMENT READY
```

### Result Codes

- `0`: All tests passed, deployment ready
- `1`: Critical tests failed, deployment blocked
- `2`: Configuration error
- `3`: Environment not ready

## Monitoring & Alerting

### Slack Notifications

```yaml
notifications:
  slack:
    enabled: true
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channels:
      - "#deployments"
      - "#alerts"
```

### Email Alerts

```yaml
notifications:
  email:
    enabled: true
    recipients:
      - "devops@company.com"
      - "qa@company.com"
    smtp_config:
      host: "smtp.company.com"
      port: 587
```

## Troubleshooting

### Common Issues

#### Connection Timeouts
```bash
# Increase timeout
SMOKE_TIMEOUT=120000 npm run test:smoke:deployment

# Check network connectivity
curl -I ${DEPLOYMENT_URL}/api/health
```

#### Authentication Failures
```bash
# Verify endpoint accessibility
curl -X POST ${DEPLOYMENT_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

#### Database Connection Issues
```bash
# Check database health endpoint
curl ${DEPLOYMENT_URL}/api/health/database

# Verify database connectivity from application logs
```

### Debug Mode

Enable detailed logging:

```bash
DEBUG=smoke-tests npm run test:smoke:deployment
```

## Best Practices

### Test Design
- Keep tests fast (< 5 minutes total)
- Focus on critical user journeys
- Use realistic test data
- Avoid dependencies on external systems

### Environment Setup
- Use separate test data
- Ensure test isolation
- Clean up after tests
- Monitor resource usage

### CI/CD Integration
- Run tests in parallel when possible
- Set appropriate timeouts
- Handle flaky tests gracefully
- Provide clear failure reasons

## Extending Tests

### Adding New Tests

1. Add test logic to `deployment-smoke-test.js`
2. Update configuration in `deployment-config.yml`
3. Add appropriate timeouts and criticality

```javascript
await this.runTest('New test name', async () => {
  const response = await axios.get(`${this.baseUrl}/api/new-endpoint`);
  expect(response.status).to.equal(200);
}, this.config.tests.new_test?.critical);
```

### Custom Configuration

Create environment-specific configurations:

```yaml
# config.production.yml
tests:
  external_services:
    enabled: true
    critical: true  # Stricter in production
```

## Performance Benchmarks

### Target Response Times
- Health checks: < 1 second
- API endpoints: < 2 seconds
- Database operations: < 500ms
- External services: < 5 seconds

### Concurrent Load
- Support 10+ concurrent requests
- Handle request queuing gracefully
- Maintain response times under load

## Security Considerations

- Never expose sensitive credentials in logs
- Use read-only test accounts
- Validate SSL/TLS certificates
- Monitor for security vulnerabilities

## Maintenance

### Regular Updates
- Review and update test scenarios quarterly
- Monitor test flakiness and fix issues
- Update dependencies regularly
- Validate against new API endpoints

### Monitoring
- Track test execution times
- Monitor failure rates
- Alert on test suite degradation
- Review test coverage periodically

---

## Quick Reference

```bash
# Development
npm run test:smoke:deployment

# Production
DEPLOYMENT_URL=https://api.example.com NODE_ENV=production npm run test:smoke:deployment

# Docker
docker-compose -f integration-tests/smoke/docker-compose.yml up smoke-tests

# Health checks only
npm run test:smoke:deployment -- --health-only
```