# Concurrent User Load Testing - Quick Reference

## Quick Start

```bash
# Standard concurrent user tests (100 users over 5 minutes)
cd integration-tests/performance
./run-concurrent-load-tests.sh

# Stress test (500 users)
./run-concurrent-load-tests.sh --stress

# Soak test (30 minutes)
./run-concurrent-load-tests.sh --soak

# All tests
./run-concurrent-load-tests.sh --all
```

## Installation

```bash
# Install Artillery
npm install -g artillery

# Install Locust
pip install locust

# Install Node dependencies
cd integration-tests
npm install
```

## Configuration

```bash
# Interactive wizard
node performance/load-test-configurator.js --wizard

# Validate current configuration
node performance/load-test-configurator.js --validate

# Export as environment script
node performance/load-test-configurator.js --export-env
```

## Running Tests

### Standard Tests
```bash
# Artillery: 100 users ramping up to peak over ~10 minutes
artillery run concurrent-users-artillery.yml --target http://localhost:5000

# Locust: 100 users over 5 minutes
locust -f concurrent-users-locust.py -u 100 -r 3 -t 300s --headless
```

### Custom Load Profile
```bash
# Set custom backend
export LOAD_TEST_URL=http://staging-api.example.com

# Run with custom URL
./run-concurrent-load-tests.sh --standard
```

## Analysis & Reporting

```bash
# Analyze latest results
npm run performance:analyze:concurrent

# Compare multiple test runs
node performance/concurrent-load-comparator.js ./test-results

# Generate HTML report
node performance/load-test-reporter.js ./test-results

# Set baseline from results
node performance/baseline-calculator.js --set <result-file.json>

# Compare to baseline
node performance/baseline-calculator.js --compare <result-file.json>

# View trends
node performance/baseline-calculator.js --trend
```

## CI/CD Integration

### npm Scripts
```json
{
  "scripts": {
    "test:performance:concurrent": "artillery run performance/concurrent-users-artillery.yml --output test-results/concurrent-users-report.json",
    "performance:analyze:concurrent": "node performance/concurrent-load-analyzer.js",
    "test:load": "performance/run-concurrent-load-tests.sh --standard",
    "test:load:stress": "performance/run-concurrent-load-tests.sh --stress",
    "test:load:soak": "performance/run-concurrent-load-tests.sh --soak",
    "test:load:analyze": "performance/run-concurrent-load-tests.sh --analyze"
  }
}
```

### GitHub Actions Example
```yaml
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

## Performance Baselines

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Avg Latency | <100ms | <500ms | >5000ms |
| P95 Latency | <200ms | <1000ms | >5000ms |
| P99 Latency | <500ms | <2000ms | >10000ms |
| Error Rate | <0.1% | <1% | >5% |
| Throughput | >500 req/s | >100 req/s | <50 req/s |

## Results Location

Test results are saved to: `integration-tests/test-results/`

Generated reports:
- `concurrent-load-test-report.txt` - Artillery analysis
- `concurrent-metrics-report.txt` - System metrics
- `concurrent-load-comparison-report.txt` - Trend analysis
- `concurrent-load-comparison.csv` - CSV export
- `*-report.html` - Interactive HTML reports
- `baseline.json` - Performance baseline history
- `SLA-validation-report.txt` - SLA compliance report

## Troubleshooting

### Backend not responding
```bash
# Check if running
curl http://localhost:5000/health

# Start backend
npm run dev  # in backend directory
```

### Artillery not found
```bash
npm install -g artillery
artillery --version
```

### Locust not found
```bash
pip install locust
locust --version
```

### Too many open files
```bash
ulimit -n 4096
```

### High error rates
- Check backend logs
- Verify test data is seeded
- Review rate limiting configuration
- Check memory and CPU usage

## Performance Optimization Tips

### If P99 Latency > 5000ms
- Profile slow endpoints
- Check database query performance
- Review external API calls
- Implement caching

### If Error Rate > 5%
- Check resource exhaustion
- Review error handling
- Monitor external dependencies
- Check network connectivity

### If Memory Grows Over Time
- Check for memory leaks
- Monitor connection pooling
- Review cache implementations
- Tune garbage collection

## Key Scenarios Tested

1. **Content Viewers (50%)** - Browse, view, stream, search
2. **Creators (20%)** - Publish, update, analyze content
3. **Subscribers (20%)** - Access premium, manage subscriptions
4. **Mixed Users (10%)** - Realistic behavior combinations

## Monitoring During Tests

```bash
# In separate terminal, monitor system metrics
node performance/concurrent-load-monitor.js http://localhost:5000 5000
```

## Advanced Usage

### Custom Test Scenarios
Edit `concurrent-users-locust.py` to add custom user behaviors:
```python
@task(2)
def custom_action(self):
    self.client.get("/api/custom", headers={"Authorization": f"Bearer {self.auth_token}"})
```

### Custom Artillery Phases
Edit `concurrent-users-artillery.yml` to adjust load profile:
```yaml
phases:
  - duration: 300
    arrivalRate: 50
    name: "Custom Phase"
```

### Custom SLA Thresholds
```bash
node performance/load-test-integration.js ./test-results \
  --avg-latency 200 \
  --p99-latency 1000 \
  --error-rate 0.5 \
  --throughput 500
```

## Recommended Test Schedule

- **Pre-release**: Run all tests (--all)
- **After deployment**: Run standard tests (--standard)
- **Weekly**: Run soak tests (--soak)
- **Before major changes**: Establish baseline

## Support

For detailed documentation, see [CONCURRENT_LOAD_TESTING.md](./CONCURRENT_LOAD_TESTING.md)
