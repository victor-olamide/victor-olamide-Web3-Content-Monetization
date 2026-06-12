# Health & Metrics Endpoints (#196)

## Overview

Two top-level endpoint groups added to the backend:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Full service health report |
| `/health/live` | GET | Kubernetes liveness probe |
| `/health/ready` | GET | Kubernetes readiness probe |
| `/health/database` | GET | MongoDB connectivity check |
| `/health/database/status` | GET | Detailed DB connection state |
| `/metrics` | GET | Prometheus exposition format |
| `/metrics/summary` | GET | JSON snapshot for debugging |

---

## GET /health

Returns service status, DB connection, uptime, and process info.

**Response 200 (healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.5,
  "uptimeMs": 3600500,
  "version": "1.0.0",
  "environment": "production",
  "database": {
    "status": "connected",
    "message": "MongoDB is reachable",
    "readyState": 1,
    "host": "localhost",
    "name": "stacks_monetization"
  },
  "process": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "pid": 1234,
    "memoryMB": 85
  }
}
```

**Response 503 (degraded):** Same shape, `status: "degraded"`, `database.status: "disconnected"`.

---

## GET /health/live

Liveness probe — returns 200 while the process is alive. Does **not** check DB.

```json
{ "status": "alive", "timestamp": "...", "uptime": 3600.5, "pid": 1234 }
```

---

## GET /health/ready

Readiness probe — 200 when MongoDB is reachable, 503 when not.

```json
{ "ready": true, "timestamp": "...", "database": { "status": "healthy", "message": "..." } }
```

---

## GET /metrics

Prometheus text exposition format. Scraped by the Prometheus server at the interval configured in `monitoring/prometheus.yml`.

**Metrics exposed:**

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request latency |
| `http_errors_total` | Counter | method, route, status_code | 4xx/5xx responses |
| `active_users_total` | Gauge | — | In-flight authenticated requests |
| `db_connection_state` | Gauge | — | 1=connected, 0=disconnected |
| `db_operation_duration_seconds` | Histogram | operation, collection | DB query latency |
| `process_uptime_seconds` | Gauge | — | Process uptime |
| `node_*` | various | — | Node.js default metrics |

Route labels are normalised (ObjectIds → `:id`, numeric IDs → `:id`) to prevent high cardinality.

---

## GET /metrics/summary

JSON snapshot of all metric values — useful for dashboards and manual inspection. Not intended for Prometheus scraping.

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metrics": {
    "http_requests_total": [...],
    "http_request_duration_seconds": [...],
    ...
  }
}
```

> **Security note:** In production, protect `/metrics` and `/metrics/summary` with an IP allowlist or bearer token to prevent leaking internal metrics to the public internet.

---

## Architecture

```
server.js
  ├── middleware/metricsMiddleware.js   ← records request count, latency, error rate
  ├── middleware/activeUsersMiddleware.js ← tracks in-flight authenticated requests
  ├── routes/healthRoutes.js  → controllers/healthController.js → services/healthService.js
  ├── routes/metricsRoutes.js → controllers/metricsController.js → services/metricsService.js
  └── config/metricsRegistry.js  ← single shared Prometheus Registry
```

---

## Prometheus Scrape Config

See `monitoring/prometheus.yml` — the backend is scraped at `http://backend:5000/metrics` every 15 seconds.
