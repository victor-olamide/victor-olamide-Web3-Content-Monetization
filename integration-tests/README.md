# Web3 Content Monetization Platform - Integration Tests

Comprehensive integration testing suite for the Web3 Content Monetization platform, covering API endpoints, end-to-end user flows, security vulnerabilities, and performance testing.

## 🧪 Test Structure

```
integration-tests/
├── api/                    # API Integration Tests
│   ├── auth.test.js       # Authentication & Authorization
│   ├── content.test.js    # Content Management
│   ├── payments.test.js   # Payment & Subscription
│   └── security.test.js   # Security Validations
├── e2e/                   # End-to-End Tests
│   └── user-flows.test.js # Complete User Journeys
├── smoke/                 # Smoke Tests
│   └── smoke.test.js     # Critical Functionality
├── security/              # Security Tests
│   └── vulnerabilities.test.js # Vulnerability Testing
├── performance/           # Performance Tests
│   └── load-test.yml     # Artillery Load Tests
├── utils/                 # Test Utilities
│   └── test-setup.js     # Global Test Setup
├── jest.*.config.js      # Jest Configurations
├── package.json          # Test Dependencies & Scripts
├── run-tests.sh          # Test Runner Script
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or Docker
- Redis (optional, for session management)
- Playwright browsers installed

### Installation

```bash
cd integration-tests
npm install
npm run install:browsers
```

### Environment Setup

Create a `.env` file in the integration-tests directory:

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
MONGODB_URI=mongodb://localhost:27017/web3-platform-test
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### Running Tests

#### Run All Tests
```bash
./run-tests.sh
# or
npm run test:all
```

#### Run Specific Test Suites
```bash
# API Tests
./run-tests.sh --api
npm run test:api

# E2E Tests
./run-tests.sh --e2e
npm run test:e2e

# Smoke Tests
./run-tests.sh --smoke
npm run test:smoke

# Security Tests
./run-tests.sh --security
npm run test:security

# Performance Tests
./run-tests.sh --performance
npm run test:performance
```

#### CI/CD Execution
```bash
npm run test:ci
```

## 📋 Test Categories

### 🔐 API Integration Tests

**Authentication & Authorization**
- User registration with validation
- Login/logout flows
- JWT token handling
- Password reset functionality
- Rate limiting on auth endpoints

**Content Management**
- Content creation and updates
- Access control (creator permissions)
- Content moderation workflow
- Search and filtering
- File upload validation

**Payment & Subscription**
- Content purchase flows
- Subscription management
- Royalty distribution
- Transaction history
- Payment security (double-spend prevention)

**Security Validations**
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Authorization bypass attempts

### 🌐 End-to-End Tests

**User Registration Flow**
- Complete signup process
- Email verification
- Profile setup
- Error handling

**Content Consumption Flow**
- Browse public content
- Purchase premium content
- Subscription access
- Download management

**Admin Panel Flow**
- Content moderation
- User management
- Analytics dashboard
- System configuration

**Error Scenarios**
- Network failures
- Session timeouts
- Invalid data handling
- Browser navigation

### 🚨 Smoke Tests

**Health Checks**
- API endpoint availability
- Database connectivity
- External service status

**Critical Functionality**
- User authentication
- Content creation
- Payment processing
- Basic search

**Performance Validation**
- Response time checks
- Concurrent request handling

### 🔒 Security Tests

**Common Vulnerabilities**
- SQL Injection attempts
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Insecure Direct Object Reference (IDOR)
- Mass Assignment attacks
- Directory Traversal
- Command Injection
- XML External Entity (XXE)
- Server-Side Request Forgery (SSRF)

**Authentication Security**
- Brute force protection
- JWT token tampering
- Session management
- Password policies

**Data Protection**
- Sensitive data exposure
- Information disclosure
- Error message sanitization

### ⚡ Performance Tests

**Load Testing Scenarios**
- Public content browsing (40% load)
- User authentication (20% load)
- Content creation (15% load)
- Payment processing (10% load)
- Search functionality (10% load)
- Error conditions (5% load)

**Performance Metrics**
- Response time percentiles (P95, P99)
- Request rate
- Apdex score
- Error rates

## 🛠️ Test Utilities

### Test Setup (`utils/test-setup.js`)

Global test utilities providing:
- MongoDB Memory Server setup
- Test user/content generation
- Authentication helpers
- API client utilities
- Cleanup functions

### Test Data Generation

```javascript
const TestUtils = require('../utils/test-setup');

// Generate test user
const user = TestUtils.generateUser({
  role: 'creator',
  email: 'test@example.com'
});

// Generate test content
const content = TestUtils.generateContent({
  creator: user._id,
  price: 10,
  accessType: 'paid'
});

// Generate JWT token
const token = TestUtils.generateToken(user);
```

## 📊 Reporting

### Test Reports

```bash
# Generate and view Allure reports
npm run report

# View Playwright HTML report
npm run report:html

# View coverage report
npm run report:coverage
```

### Coverage Reports

- HTML coverage reports in `coverage/`
- LCOV format for CI/CD integration
- Coverage thresholds enforcement

### Performance Reports

- Artillery HTML reports
- Response time analysis
- Error rate monitoring
- Apdex score tracking

## 🔧 Configuration

### Jest Configurations

- `jest.api.config.js` - API integration tests
- `jest.smoke.config.js` - Smoke tests
- `jest.security.config.js` - Security tests

### Playwright Configuration

- Multi-browser testing (Chrome, Firefox, Safari)
- Screenshot/video capture on failures
- Trace collection for debugging

### Artillery Configuration

- Multi-phase load testing
- Custom metrics collection
- Threshold-based assertions

## 🚨 CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Setup MongoDB
        uses: supercharge/mongodb-github-action@1.8.0
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install
      - name: Run tests
        run: npm run test:ci
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: integration-tests/test-results/
```

## 🐛 Debugging

### Running Tests in Debug Mode

```bash
# Debug API tests
npm run test:api -- --verbose --detectOpenHandles

# Debug E2E tests
npm run test:e2e -- --debug

# Debug with inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues

**MongoDB Connection Issues**
```bash
# Start local MongoDB
mongod --dbpath /tmp/mongodb

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

**Browser Issues**
```bash
# Reinstall Playwright browsers
npx playwright install --force
```

**Port Conflicts**
```bash
# Kill processes on specific ports
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

## 📈 Best Practices

### Test Organization
- One test file per feature/module
- Clear test descriptions
- Proper setup/teardown
- Independent test cases

### Test Data Management
- Use factories for test data generation
- Clean up after each test
- Avoid test data dependencies
- Use realistic test data

### Performance Considerations
- Use test parallelism when possible
- Mock external services
- Clean up resources properly
- Monitor test execution time

### Security Testing
- Test both positive and negative scenarios
- Use realistic attack payloads
- Verify security headers
- Test rate limiting effectiveness

## 🤝 Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow existing naming conventions
3. Add proper setup/teardown
4. Update this README if needed
5. Run full test suite before submitting

### Test Standards

- Tests should be deterministic
- Use descriptive test names
- Include edge cases
- Mock external dependencies
- Clean up test data

## 📄 License

This project is part of the Web3 Content Monetization platform. See main project license for details.
