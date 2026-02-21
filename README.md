# Web3 Content Monetization Platform

A comprehensive platform for content monetization on blockchain networks, featuring streaming, subscriptions, and pay-per-view functionality.

## Features

- **Content Streaming**: High-performance content delivery with adaptive bitrate
- **Blockchain Integration**: Smart contracts for secure monetization
- **User Management**: Role-based access control (Creators, Subscribers, Admins)
- **Load Testing**: Comprehensive concurrent user load testing infrastructure
- **Real-time Monitoring**: Live performance dashboards and metrics
- **CI/CD Integration**: Automated testing and deployment pipelines

## Architecture

### Backend (Node.js/Express)
- RESTful API with authentication and authorization
- Rate limiting and content moderation
- Analytics and performance monitoring
- Database integration (MongoDB)

### Frontend (Next.js/React)
- Modern web application with responsive design
- Content browsing and streaming interface
- Creator dashboard and analytics
- Admin management console

### Blockchain (Clarity/Solidity)
- Smart contracts for content ownership and payments
- NFT integration for digital assets
- Decentralized content distribution

### Testing Infrastructure
- **Unit Tests**: Jest-based testing for components
- **Integration Tests**: API and E2E testing with Playwright
- **Performance Tests**: Artillery and Locust load testing
- **Load Testing**: Concurrent user testing with real-time monitoring

## Load Testing

The platform includes comprehensive load testing capabilities to ensure performance under concurrent user load:

### Quick Start
```bash
cd integration-tests
npm run test:performance:concurrent  # Run concurrent user load test
npm run performance:analyze:concurrent  # Analyze results
npm run performance:monitor  # Start monitoring dashboard
```

### Test Scenarios
- Content viewers browsing and streaming
- Creators publishing and managing content
- Subscribers accessing premium content
- Admin users monitoring system performance

### Monitoring Dashboard
Access the real-time monitoring dashboard at `http://localhost:3001` to view:
- Live performance metrics
- Concurrent user counts
- Response times and throughput
- Error rates and alerts

## Development

### Prerequisites
- Node.js 18+
- MongoDB
- Clarinet (for Clarity contracts)
- Hardhat (for Solidity contracts)

### Setup
```bash
# Install dependencies
npm install

# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm run dev

# Run tests
cd integration-tests && npm test
```

## Deployment

The platform supports deployment to various environments with automated CI/CD:

- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live environment with monitoring

### Load Testing in CI/CD
Automated load testing runs weekly and can be triggered manually:
- GitHub Actions workflow for scheduled and on-demand testing
- Environment-specific testing (staging/production)
- Performance report generation and artifact storage

## Documentation

- [Performance Testing](integration-tests/performance/README.md)
- [Concurrent Load Testing](integration-tests/performance/CONCURRENT_LOAD_TESTING_IMPLEMENTATION.md)
- [API Documentation](backend/docs/)
- [Smart Contracts](contracts/README.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with comprehensive tests
4. Run load tests to ensure performance
5. Submit a pull request

## License

This project is licensed under the MIT License.