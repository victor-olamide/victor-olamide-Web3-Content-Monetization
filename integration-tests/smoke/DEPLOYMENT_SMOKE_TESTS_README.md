# Deployment Smoke Tests — Issue #195

Automated smoke test suite that runs after each staging deployment.

## Validated areas (all critical — block deployment on failure)

| Area | Endpoint(s) | Critical |
|---|---|---|
| Health check | `GET /health`, `GET /health/database`, `GET /metrics` | ✅ |
| Auth endpoints | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` | ✅ |
| Content API | `GET /api/content` | ✅ |
| Database connectivity | `GET /health/database`, `GET /health/database/status`, mongoose readyState | ✅ |
| External services | Blockchain cache stats | ⚠️ non-critical |
| Performance | Response time < 2 s, 5 concurrent requests | ⚠️ non-critical |

## File structure

```
integration-tests/smoke/
├── deployment-smoke-test.js   # Main CLI smoke runner
├── smoke.test.js              # Jest test suite (same 4 areas)
├── smoke-retry.js             # Retry utility with exponential back-off
├── smoke-reporter.js          # JSON result reporter for CI artifacts
├── check-deployment-gate.js   # Reads latest report and exits 1 on critical failure
├── deployment-config.yml      # Per-environment configuration
├── run-deployment-smoke-tests.sh  # Shell wrapper with retries + gate check
├── Dockerfile                 # Containerised runner
└── docker-compose.yml         # Orchestration
```

## Quick start

```bash
# Run all smoke tests (exits 1 if any critical test fails)
npm run test:smoke:deployment

# Health checks only (fast pre-flight)
npm run test:smoke:deployment:health

# Jest suite (integrates with coverage / JUnit reporting)
npm run test:smoke:ci

# Check gate against last saved report
npm run test:smoke:gate
```

## CI/CD integration

The GitHub Actions workflow `.github/workflows/deployment-smoke-tests.yml`:

1. Triggers automatically after the "Deploy to Staging" workflow succeeds.
2. Waits up to 2 minutes for the deployment URL to become healthy.
3. Runs health-only checks first (fast gate).
4. Runs the full smoke suite.
5. Runs `check-deployment-gate.js` — exits 1 to **block the pipeline** on any critical failure.
6. Uploads JSON results as a CI artifact (retained 14 days).

```yaml
# Manual trigger
workflow_dispatch:
  inputs:
    deployment_url: { required: false, default: 'http://localhost:5000' }
    environment:    { required: false, default: 'staging' }
```

## Configuration

Edit `deployment-config.yml` to change per-environment timeouts, retries, and which tests are critical:

```yaml
tests:
  health_checks:
    critical: true   # blocks deployment
  authentication:
    critical: true
  content_api:
    critical: true
  database_connectivity:
    critical: true
  external_services:
    critical: false  # warns but allows deployment
  performance:
    critical: false
```

## Blocking behaviour

A deployment is **blocked** when:
- Any health check fails (status ≠ `healthy`, DB ≠ `connected`)
- Any auth endpoint returns 404 or 500
- Content API returns 500 or non-JSON
- MongoDB `readyState` ≠ 1

Exit codes:
- `0` — all critical checks passed, deployment ready
- `1` — one or more critical checks failed, deployment blocked
