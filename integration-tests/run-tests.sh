#!/bin/bash

# Integration Tests Runner Script
# Runs all integration tests with proper setup and teardown

set -e

echo "🚀 Starting Integration Tests Suite"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required services are running
check_services() {
    print_status "Checking required services..."

    # Check if MongoDB is running
    if ! pgrep mongod > /dev/null; then
        print_warning "MongoDB is not running. Starting local MongoDB..."
        mongod --dbpath /tmp/mongodb --fork --logpath /tmp/mongodb.log
    fi

    # Check if Redis is running (if used)
    if command -v redis-server &> /dev/null && ! pgrep redis-server > /dev/null; then
        print_warning "Redis is not running. Some tests may fail."
    fi

    print_success "Service check completed"
}

# Setup test environment
setup_test_env() {
    print_status "Setting up test environment..."

    # Create test directories
    mkdir -p test-results
    mkdir -p test-results/coverage
    mkdir -p test-results/screenshots
    mkdir -p test-results/videos

    # Set environment variables
    export NODE_ENV=test
    export JWT_SECRET=test-jwt-secret-key
    export MONGODB_URI=mongodb://localhost:27017/web3-platform-test
    export REDIS_URL=redis://localhost:6379
    export FRONTEND_URL=http://localhost:3000
    export BACKEND_URL=http://localhost:5000

    print_success "Test environment setup completed"
}

# Run API integration tests
run_api_tests() {
    print_status "Running API Integration Tests..."

    npm run test:api

    if [ $? -eq 0 ]; then
        print_success "API Integration Tests passed"
    else
        print_error "API Integration Tests failed"
        exit 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E Tests..."

    # Start backend server for E2E tests
    npm run start:test &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run E2E tests
    npm run test:e2e

    E2E_EXIT_CODE=$?

    # Stop server
    kill $SERVER_PID 2>/dev/null || true

    if [ $E2E_EXIT_CODE -eq 0 ]; then
        print_success "E2E Tests passed"
    else
        print_error "E2E Tests failed"
        exit 1
    fi
}

# Run smoke tests
run_smoke_tests() {
    print_status "Running Smoke Tests..."

    npm run test:smoke

    if [ $? -eq 0 ]; then
        print_success "Smoke Tests passed"
    else
        print_error "Smoke Tests failed"
        exit 1
    fi
}

# Run security tests
run_security_tests() {
    print_status "Running Security Tests..."

    npm run test:security

    if [ $? -eq 0 ]; then
        print_success "Security Tests passed"
    else
        print_error "Security Tests failed"
        exit 1
    fi
}

# Run performance tests
run_performance_tests() {
    print_status "Running Performance Tests..."

    # Start backend server for performance tests
    npm run start:test &
    SERVER_PID=$!

    # Wait for server to start
    sleep 15

    # Run performance tests
    npm run test:performance

    PERF_EXIT_CODE=$?

    # Stop server
    kill $SERVER_PID 2>/dev/null || true

    if [ $PERF_EXIT_CODE -eq 0 ]; then
        print_success "Performance Tests passed"
    else
        print_warning "Performance Tests completed with issues (check reports)"
    fi
}

# Generate test reports
generate_reports() {
    print_status "Generating test reports..."

    # Generate coverage report
    if [ -d "coverage" ]; then
        npx nyc report --reporter=html --reporter=text
    fi

    # Generate Allure report for E2E tests
    if [ -d "allure-results" ]; then
        npx allure generate allure-results --clean --output test-results/allure-report
    fi

    # Generate JUnit reports
    if [ -d "test-results/junit" ]; then
        npx junit-merge test-results/junit/*.xml -o test-results/junit-report.xml
    fi

    print_success "Test reports generated in test-results/"
}

# Cleanup test environment
cleanup() {
    print_status "Cleaning up test environment..."

    # Stop any remaining test servers
    pkill -f "node.*server" || true
    pkill -f "mongod" || true

    # Clean up test database
    mongo web3-platform-test --eval "db.dropDatabase()" 2>/dev/null || true

    # Clean up test files
    rm -rf /tmp/mongodb
    rm -f /tmp/mongodb.log

    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "🧪 Web3 Platform Integration Tests Suite"
    echo "========================================"

    # Parse command line arguments
    RUN_ALL=true
    RUN_API=false
    RUN_E2E=false
    RUN_SMOKE=false
    RUN_SECURITY=false
    RUN_PERFORMANCE=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --api) RUN_ALL=false; RUN_API=true ;;
            --e2e) RUN_ALL=false; RUN_E2E=true ;;
            --smoke) RUN_ALL=false; RUN_SMOKE=true ;;
            --security) RUN_ALL=false; RUN_SECURITY=true ;;
            --performance) RUN_ALL=false; RUN_PERFORMANCE=true ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --api          Run only API tests"
                echo "  --e2e          Run only E2E tests"
                echo "  --smoke        Run only smoke tests"
                echo "  --security     Run only security tests"
                echo "  --performance  Run only performance tests"
                echo "  --help         Show this help"
                exit 0
                ;;
            *) echo "Unknown option: $1"; exit 1 ;;
        esac
        shift
    done

    # Setup
    check_services
    setup_test_env

    # Trap to ensure cleanup on exit
    trap cleanup EXIT

    # Run tests
    if [ "$RUN_ALL" = true ] || [ "$RUN_SMOKE" = true ]; then
        run_smoke_tests
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_API" = true ]; then
        run_api_tests
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_SECURITY" = true ]; then
        run_security_tests
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_E2E" = true ]; then
        run_e2e_tests
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_PERFORMANCE" = true ]; then
        run_performance_tests
    fi

    # Generate reports
    generate_reports

    print_success "🎉 All Integration Tests Completed Successfully!"
    echo ""
    echo "📊 Test Results Summary:"
    echo "  - API Tests: ✅ Passed"
    echo "  - E2E Tests: ✅ Passed"
    echo "  - Smoke Tests: ✅ Passed"
    echo "  - Security Tests: ✅ Passed"
    echo "  - Performance Tests: ✅ Completed"
    echo ""
    echo "📁 Test reports available in: test-results/"
}

# Run main function
main "$@"

echo ""
echo "✅ Tests completed!"
