# Concurrent User Load Testing Documentation

## Overview

This document describes the comprehensive concurrent user load testing implementation for the Web3 Content Monetization platform. The test suite is designed to evaluate system behavior under high concurrent user load, identify bottlenecks, and provide actionable performance insights.

## Test Architecture

### Load Testing Tools

The test suite supports two primary load testing frameworks:

1. **Artillery** - Node.js-based HTTP load testing
   - Declarative YAML configuration
   - Built-in metrics aggregation
   - Support for multiple phases and scenarios
   - Real-time reporting capabilities

2. **Locust** - Python-based distributed load testing
   - User-based load generation
   - TaskSet-based realistic behavior simulation
   - Swarm-style load ramp-up
   - CSV export and custom event handling

## Test Scenarios

### 1. Content Viewer (50% of load)
Simulates regular users browsing and streaming content:
- Browse content catalog
- View content details
- Stream/download content
- Like content
- Search for content

**Load Profile:**
- Warm-up: 5 users/sec for 60s
- Ramp-up: 25 users/sec for 120s
- Sustained: 50 users/sec for 180s
- Peak: 100 users/sec for 240s

### 2. Creator (20% of load)
Simulates content creators publishing and managing content:
- Publish new content
- Update content details
- View analytics
- List published content
- Analyze viewer metrics

**Interactions:**
- Higher think times between actions
- More CPU-intensive operations
- Lower frequency than viewers

### 3. Subscriber (20% of load)
Simulates premium subscribers accessing exclusive content:
- View subscriptions
- Access premium content
- Manage payment methods
- Check subscription status
- Upgrade/downgrade plans

### 4. Mixed Behavior (10% of load)
Realistic user behavior combining all actions

## Test Modes

### Standard Tests
```bash
./run-concurrent-load-tests.sh --standard
```
Runs Artillery and Locust tests with 100 concurrent users over 5+ minutes.

**Metrics Collected:**
- Response latency (min, mean, P95, P99, max)
- Throughput (requests per second)
- Error rates and status code distribution
- Per-endpoint performance metrics

### Stress Tests
```bash
./run-concurrent-load-tests.sh --stress
```
Ramps up to 500 concurrent users to identify failure points.

**Purpose:**
- Find system breaking points
- Identify maximum capacity
- Reveal resource exhaustion issues

### Soak Tests
```bash
./run-concurrent-load-tests.sh --soak
```
Maintains sustained load (50 users) for 30 minutes.

**Purpose:**
- Detect memory leaks
- Identify connection pool issues
- Find performance degradation over time
- Verify graceful recovery

## Running Tests

### Prerequisites

1. **Install Dependencies**
```bash
# Install Artillery globally
npm install -g artillery

# Install Locust (Python 3.7+)
pip install locust

# Install Node dependencies
cd integration-tests
npm install
```

2. **Start Backend Server**
```bash
# Ensure backend is running on localhost:5000
npm run dev  # or your backend start command
```

3. **Environment Configuration**
```bash
# Optional: Set custom backend URL
export LOAD_TEST_URL=http://your-backend:5000

# Or modify in test files directly
```

### Quick Start

```bash
# Run standard concurrent user tests
cd integration-tests/performance
./run-concurrent-load-tests.sh

# Run with custom backend URL
LOAD_TEST_URL=http://staging-api.example.com ./run-concurrent-load-tests.sh --all

# Run specific test mode
./run-concurrent-load-tests.sh --stress
./run-concurrent-load-tests.sh --soak
```

### Running Individual Tests

```bash
# Artillery only
artillery run concurrent-users-artillery.yml --target http://localhost:5000

# Locust only
locust -f concurrent-users-locust.py -u 100 -r 3 -t 300s --headless

# Node.js runner
node run-concurrent-load-tests.js all

# Monitor system metrics
node concurrent-load-monitor.js http://localhost:5000 5000
```

## Results Analysis

### Generated Reports

After each test run, the following reports are generated:

1. **concurrent-load-test-report.txt** - Artillery metrics analysis
   - Summary statistics
   - Latency distribution
   - Status code breakdown
   - Per-scenario performance
   - Recommendations

2. **concurrent-metrics-report.txt** - System metrics
   - Memory usage patterns
   - CPU load distribution
   - Peak resource consumption

3. **concurrent-load-comparison-report.txt** - Trend analysis
   - Multi-run comparison
   - Regression detection
   - Performance trends
   - Improvement suggestions

4. **concurrent-load-comparison.csv** - Data export
   - Raw metrics in CSV format
   - Suitable for Excel/spreadsheet analysis
   - Easy statistical analysis

### Key Metrics

| Metric | Ideal | Acceptable | Critical |
|--------|-------|------------|----------|
| P95 Latency | <100ms | <500ms | >5000ms |
| P99 Latency | <200ms | <1000ms | >10000ms |
| Error Rate | <0.1% | <1% | >5% |
| Throughput | >500 req/s | >100 req/s | <50 req/s |
| Memory Growth | Stable | <5%/hour | >20%/hour |

### Performance Analysis

```bash
# Analyze existing results
./run-concurrent-load-tests.sh --analyze

# Compare multiple test runs
node concurrent-load-comparator.js ./test-results
```

## Optimization Recommendations

### Based on Test Results

1. **High Latency (P99 > 5s)**
   - Profile slow endpoints
   - Check database query optimization
   - Verify network performance
   - Consider caching strategies

2. **High Error Rates (> 5%)**
   - Review error logs
   - Check resource exhaustion
   - Validate error handling
   - Monitor external dependencies

3. **Memory Growth**
   - Check for memory leaks
   - Monitor connection pools
   - Review cache implementations
   - Implement garbage collection tuning

4. **CPU Saturation**
   - Profile CPU hotspots
   - Optimize algorithms
   - Consider worker threads
   - Scale horizontally

## CI/CD Integration

### npm Scripts

Add to `integration-tests/package.json`:

```json
{
  "scripts": {
    "test:load": "./performance/run-concurrent-load-tests.sh --standard",
    "test:load:stress": "./performance/run-concurrent-load-tests.sh --stress",
    "test:load:soak": "./performance/run-concurrent-load-tests.sh --soak",
    "test:load:analyze": "./performance/run-concurrent-load-tests.sh --analyze",
    "test:load:all": "./performance/run-concurrent-load-tests.sh --all"
  }
}
```

### GitHub Actions Example

```yaml
name: Load Testing
on: [push, pull_request]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Artillery
        run: npm install -g artillery
      - name: Start Backend
        run: npm run dev &
        working-directory: ./backend
      - name: Run Load Tests
        run: npm run test:load
        working-directory: ./integration-tests
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: integration-tests/test-results/
```

## Troubleshooting

### Common Issues

1. **"Backend not responding"**
   ```bash
   # Check if backend is running
   curl http://localhost:5000/health
   
   # Start backend if needed
   npm run dev
   ```

2. **"Artillery not found"**
   ```bash
   npm install -g artillery
   artillery --version
   ```

3. **"Locust not found"**
   ```bash
   pip install locust
   locust --version
   ```

4. **"Too many open files"**
   ```bash
   # Increase ulimit
   ulimit -n 4096
   ```

5. **High error rates during test**
   - Check backend logs for errors
   - Verify test data is seeded
   - Check network connectivity
   - Review rate limiting configuration

## Performance Baselines

### Expected Performance Targets

For the Web3 Content Monetization platform under concurrent user load:

```
Concurrent Users: 100
Average Latency: 100-200ms
P95 Latency: 300-500ms
P99 Latency: 500-1000ms
Throughput: 1000-2000 req/s
Error Rate: <0.5%
Memory Stable: ±5MB variation
CPU Usage: 40-70% on modern hardware
```

## Advanced Configuration

### Custom Load Profiles

Edit `concurrent-users-artillery.yml` to customize:

```yaml
config:
  phases:
    - duration: 300      # Test duration in seconds
      arrivalRate: 50    # Users joining per second
      name: "My Phase"   # Phase description
```

### Custom User Behaviors

Edit `concurrent-users-locust.py` to add custom tasks:

```python
@task(2)
def custom_endpoint(self):
    self.client.get("/api/custom", headers={"Authorization": f"Bearer {self.auth_token}"})
```

## Support and Feedback

For issues or improvements to the load testing suite:

1. Check existing documentation
2. Review test logs in `test-results/`
3. Enable debug logging in tests
4. Create detailed GitHub issues with:
   - Test configuration used
   - System information
   - Full error messages
   - Expected vs actual behavior

## References

- [Artillery Documentation](https://artillery.io/)
- [Locust Documentation](https://docs.locust.io/)
- [HTTP Load Testing Best Practices](https://en.wikipedia.org/wiki/Load_testing)
- [Performance Testing Strategy](https://www.perfmatrix.com/performance-testing-tutorial/)
