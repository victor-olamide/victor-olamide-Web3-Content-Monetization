# Content Delivery Performance Testing Suite

This directory contains comprehensive performance testing tools for content streaming endpoints in the Web3 Content Monetization platform.

## Overview

The performance testing suite provides:
- **Load Testing**: Artillery-based load tests for content delivery endpoints
- **Video Streaming Tests**: Specialized tests for video content delivery
- **Locust Load Tests**: Python-based load testing with Locust for content streaming
- **Real-time Monitoring**: Live performance dashboard and metrics
- **Performance Analysis**: Automated analysis and reporting tools
- **CI/CD Integration**: Automated performance regression testing

## Test Scenarios

### Content Delivery Load Test (`content-delivery-load-test.yml`)
- **Metadata Access**: Testing content metadata retrieval performance
- **Content Streaming**: Authenticated content access with rate limiting
- **Content Previews**: Preview generation and batch access performance
- **CDN Integration**: Content delivery network performance validation
- **Access Tokens**: Temporary access token generation and validation

### Video Streaming Load Test (`video-streaming-load-test.yml`)
- **HD Video Streaming**: High-definition video delivery with chunking
- **CDN Video Delivery**: Video content distribution through CDN
- **Adaptive Bitrate**: Quality-based streaming performance
- **Live Streaming**: Real-time streaming simulation
- **Analytics**: Performance metrics collection and analysis

### Locust Load Test (`content-streaming-locust.py`)
- **Python-based Load Testing**: Using Locust for flexible content streaming tests
- **Multiple Tasks**: Stream content and fetch metadata with different weights
- **Error Handling**: Built-in response validation and failure detection
- **Scalable**: Easy to configure user count and test duration

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

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