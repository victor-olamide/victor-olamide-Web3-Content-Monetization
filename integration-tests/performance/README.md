# Load Testing Suite

Comprehensive load testing framework for the Web3 Content Monetization Platform with concurrent user simulation, baseline calculation, and CI/CD integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or remote
- Backend server running on port 5000

### Installation

```bash
# Install integration test dependencies
cd integration-tests
npm install

# Install Artillery globally (optional, fallback to mock results)
npm install -g artillery

# Install Locust (optional, fallback to mock results)
pip install locust
```

### Running Tests

```bash
# Run all load tests
cd integration-tests/performance
node run-concurrent-load-tests.js all

# Run specific test modes
node run-concurrent-load-tests.js artillery-only    # Artillery only
node run-concurrent-load-tests.js locust-only       # Locust only
node run-concurrent-load-tests.js stress           # Stress test
node run-concurrent-load-tests.js soak             # Soak test

# Show help
node run-concurrent-load-tests.js --help
```

## 📊 Test Scenarios

### User Types

1. **Content Viewer** (50% of traffic)
   - Browse content catalog
   - View content details
   - Stream premium content
   - Like/comment on content

2. **Content Creator** (20% of traffic)
   - Publish new content
   - Update existing content
   - View analytics
   - Manage content library

3. **Subscriber** (20% of traffic)
   - Access premium content
   - Manage subscriptions
   - View payment methods
   - Check subscription status

4. **Mixed/Admin** (10% of traffic)
   - General browsing
   - Admin dashboard access

### Test Phases

- **Warm up**: 5 concurrent users for 60s
- **Ramp up**: 25 concurrent users for 120s
- **Sustained load**: 50 concurrent users for 180s
- **Peak load**: 100 concurrent users for 240s
- **Maintain peak**: 75 concurrent users for 180s
- **Cool down**: 50→10 concurrent users for 120s

## 📈 Baseline Management

### Setting Baselines

```bash
# Set baseline from current test results
node baseline-calculator.js --set test-results/concurrent-users-artillery-results.json

# Compare against baseline
node baseline-calculator.js --compare test-results/latest-results.json

# View performance trends
node baseline-calculator.js --trend
```

### Baseline Metrics

- **P95 Latency**: 95th percentile response time
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **P99 Latency**: 99th percentile response time
- **Max Latency**: Maximum response time

## 🔧 CI/CD Integration

### GitHub Actions

The load testing suite integrates with GitHub Actions for automated testing:

```yaml
# Trigger load tests on PR or push to main
on:
  pull_request:
    paths: ['backend/**', 'integration-tests/performance/**']
  push:
    branches: [main]
    paths: ['backend/**', 'integration-tests/performance/**']

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run load tests
        run: |
          cd integration-tests/performance
          node ci-integration.js
```

### CI Outputs

The CI integration provides:

- **Test Results**: JSON files with detailed metrics
- **CI Artifacts**: Stored test data and baselines
- **Performance Summary**: Human-readable analysis
- **PR Comments**: Automatic performance reports
- **Status Checks**: Pass/fail based on regression detection

## 📋 Configuration

### Environment Variables

```bash
# Target URL for testing
LOAD_TEST_URL=http://localhost:5000

# Enable CI mode
CI=true

# GitHub Actions output file
GITHUB_OUTPUT=/dev/stdout
```

### Customizing Tests

#### Artillery Configuration

Edit `concurrent-users-artillery.yml` to modify:
- Load phases and user counts
- Request scenarios and weights
- Target endpoints and headers

#### Locust Configuration

Edit `concurrent-users-locust.py` to modify:
- User behavior and task weights
- Wait times between requests
- Test scenarios and logic

## 📊 Results Analysis

### Performance Summary

After running tests, view the performance summary:

```bash
cat test-results/performance-summary.json
```

Key sections:
- **Results**: Raw metrics from Artillery/Locust
- **Baselines**: Performance baselines
- **Analysis**: Regression detection and risk assessment
- **Trends**: Historical performance trends
- **Recommendations**: Actionable improvement suggestions

### CI Artifacts

Test artifacts are stored in `ci-artifacts/`:
- `*-artillery.json`: Artillery test results
- `*-locust.csv`: Locust test results
- `*-baseline.json`: Performance baselines
- `*-summary.json`: Analysis summary
- `*-manifest.json`: Artifact inventory

## 🚨 Regression Detection

The system automatically detects performance regressions:

### Risk Levels

- **Low**: Minor improvements or stable performance
- **Medium**: Moderate performance changes
- **High**: Significant regressions requiring attention

### Failure Conditions

Tests fail if:
- Performance status is "degraded"
- Critical regressions are detected
- Required artifacts are missing

## 🛠️ Troubleshooting

### Common Issues

1. **Artillery/Locust not found**
   - Tests run with mock data
   - Install tools for real testing: `npm install -g artillery && pip install locust`

2. **Backend connection failed**
   - Ensure backend is running on port 5000
   - Check `LOAD_TEST_URL` environment variable

3. **MongoDB connection issues**
   - Ensure MongoDB is running
   - Check connection string in backend config

### Debug Mode

```bash
# Run with verbose logging
DEBUG=* node run-concurrent-load-tests.js all

# Test backend connectivity
curl http://localhost:5000/api/health
```

## 📈 Performance Monitoring

### Key Metrics to Monitor

1. **Latency**: P95 should stay under 500ms
2. **Throughput**: Should handle 50+ concurrent users
3. **Error Rate**: Should be under 1%
4. **Memory Usage**: Monitor for leaks during soak tests

### Baseline Updates

Update baselines when:
- Infrastructure changes
- Code optimizations are deployed
- Performance improvements are verified

```bash
# Update baseline after improvements
node baseline-calculator.js --set test-results/new-baseline.json
```

## 🤝 Contributing

### Adding New Test Scenarios

1. Update Artillery/Locust configurations
2. Add scenario documentation
3. Update baseline expectations
4. Test in CI environment

### Performance Standards

- P95 latency: < 500ms
- Error rate: < 1%
- Throughput: > 50 req/s
- Memory usage: < 512MB sustained

---

For questions or issues, check the [integration tests README](../README.md) or create an issue in the repository.

# Install Locust for Python-based load testing
pip install locust

# Ensure backend is running on localhost:3000
cd ../backend && npm start
```

### Run Performance Tests
```bash
# Run content delivery performance test
npm run test:performance:content

# Run video streaming performance test
npm run test:performance:video

# Run Locust load test
locust -f content-streaming-locust.py

# Run all performance tests
npm run test:performance:all
```

### Analyze Results
```bash
# Analyze specific test results
npm run performance:analyze -- content-delivery-load-test

# Compare multiple test results
npm run performance:compare
```

### Start Performance Monitor
```bash
# Start real-time monitoring dashboard
npm run performance:monitor
# Dashboard available at: http://localhost:3001
```

## Test Configuration

### Load Phases
Each test includes multiple phases to simulate realistic traffic patterns:

1. **Warm-up Phase**: Low load to initialize systems
2. **Load Testing Phase**: Moderate concurrent users
3. **Stress Testing Phase**: High load to test limits
4. **Recovery Phase**: Gradual load reduction

### Performance Thresholds
- **Response Time (P95)**: < 2000ms for content delivery, < 5000ms for video
- **Error Rate**: < 1% for content delivery, < 2% for video streaming
- **Throughput**: > 10 req/sec for content delivery, > 5 req/sec for video

## Real-time Monitoring

### Dashboard Features
- **Live Metrics**: Real-time performance metrics display
- **Interactive Charts**: Response time and throughput trends
- **Alert System**: Automatic performance issue detection
- **Historical Data**: Performance history and trends

### Starting the Monitor
```bash
npm run performance:monitor
```

The dashboard provides:
- Current performance metrics
- Historical performance trends
- Active alerts and warnings
- Test execution controls

## Performance Analysis

### Automated Analysis
The analysis tool provides:
- **Performance Scoring**: A/B/C grading based on thresholds
- **Detailed Metrics**: Comprehensive performance breakdown
- **Recommendations**: Actionable performance improvement suggestions
- **Comparative Analysis**: Side-by-side test result comparisons

### Usage Examples
```bash
# Analyze content delivery test
node performance/analyze-performance.js content-delivery-load-test

# Compare video vs content delivery
node performance/analyze-performance.js compare content-delivery-load-test video-streaming-load-test
```

## Test Results Structure

```
test-results/
├── content-delivery-report.json    # Content delivery test results
├── video-streaming-report.json     # Video streaming test results
└── performance-analysis.md         # Analysis summary
```

## Customizing Tests

### Modifying Load Patterns
Edit the `phases` section in test configuration files:

```yaml
phases:
  - duration: 300    # 5 minutes
    arrivalRate: 20  # 20 requests per second
    name: "Heavy Load Phase"
```

### Adding New Scenarios
Add scenarios to test new endpoints:

```yaml
- name: "New Content Type"
  weight: 10
  flow:
    - get:
        url: "/api/content/new-type/{{ $randomInt(1, 100) }}"
        expect:
          - statusCode: 200
```

### Custom Metrics
Add custom performance metrics:

```yaml
plugins:
  - metrics-by-endpoint: {}
  - ensure:
      thresholds:
        "http.response_time.p99": 5000
        "custom.metric": 100
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run performance tests
        run: npm run test:performance:all
      - name: Analyze results
        run: npm run performance:analyze
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test-results/
```

### Performance Regression Detection
```bash
# Compare against baseline
npm run performance:analyze -- --baseline baseline-report.json
```

## Troubleshooting

### Common Issues

**Backend Not Running**
```bash
# Ensure backend is running
cd ../backend && npm start
```

**Port Conflicts**
```bash
# Change monitor port
PORT=3002 npm run performance:monitor
```

**Test Timeouts**
```bash
# Increase Artillery timeout
export ARTILLERY_TIMEOUT=120000
```

**Memory Issues**
```bash
# Run with increased memory
node --max-old-space-size=4096 performance/monitor.js
```

## Performance Optimization Tips

### Content Delivery
1. **Implement CDN**: Use content delivery networks for global distribution
2. **Enable Compression**: Gzip/Brotli compression for text content
3. **Cache Headers**: Proper cache-control headers
4. **Database Indexing**: Optimize database queries
5. **Connection Pooling**: Reuse database connections

### Video Streaming
1. **Adaptive Bitrate**: Implement HLS/DASH streaming
2. **Video Chunking**: Break videos into smaller segments
3. **CDN Integration**: Global video distribution
4. **Format Optimization**: Use efficient video codecs
5. **Progressive Loading**: Load metadata first, then content

### Monitoring
1. **Real-time Alerts**: Set up performance alerting
2. **Trend Analysis**: Monitor performance over time
3. **Load Balancing**: Distribute load across multiple servers
4. **Auto-scaling**: Scale resources based on demand

## Contributing

When adding new performance tests:

1. Follow existing naming conventions
2. Include realistic load patterns
3. Add appropriate performance thresholds
4. Update documentation
5. Test in CI/CD pipeline

## Related Documentation

- [Backend API Documentation](../backend/docs/)
- [CDN Integration Guide](../backend/docs/cdn-integration.md)
- [Video Streaming Guide](../backend/docs/video-streaming.md)
- [Load Testing Best Practices](../docs/load-testing.md)