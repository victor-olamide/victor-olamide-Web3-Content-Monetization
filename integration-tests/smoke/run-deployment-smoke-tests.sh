#!/bin/bash

##############################################################################
# Deployment Smoke Test Runner
# Executes automated smoke tests after deployment
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"
SMOKE_DIR="${PROJECT_ROOT}/smoke"
DEPLOYMENT_URL="${DEPLOYMENT_URL:-http://localhost:5000}"
ENVIRONMENT="${NODE_ENV:-development}"
TIMEOUT="${SMOKE_TIMEOUT:-300}"
RETRIES="${SMOKE_RETRIES:-3}"

##############################################################################
# Functions
##############################################################################

print_header() {
  echo -e "\n${BOLD}${BLUE}========================================${NC}"
  echo -e "${BOLD}${BLUE}$1${NC}"
  echo -e "${BOLD}${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

check_dependencies() {
  print_info "Checking dependencies..."

  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi

  # Check npm
  if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
  fi

  # Check if smoke test script exists
  if [ ! -f "${SMOKE_DIR}/deployment-smoke-test.js" ]; then
    print_error "Smoke test script not found: ${SMOKE_DIR}/deployment-smoke-test.js"
    exit 1
  fi

  print_success "Dependencies check passed"
}

setup_environment() {
  print_info "Setting up test environment..."

  cd "${PROJECT_ROOT}"

  # Install dependencies if node_modules doesn't exist
  if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm ci
  fi

  # Install additional test dependencies
  if ! npm list axios &> /dev/null; then
    print_info "Installing test dependencies..."
    npm install axios chai js-yaml
  fi

  print_success "Environment setup complete"
}

run_smoke_tests() {
  print_header "RUNNING DEPLOYMENT SMOKE TESTS"

  local attempt=1
  local max_attempts=$RETRIES
  local success=false

  while [ $attempt -le $max_attempts ]; do
    print_info "Attempt $attempt of $max_attempts"

    if [ $attempt -gt 1 ]; then
      print_info "Waiting before retry..."
      sleep 10
    fi

    # Run the smoke tests
    if DEPLOYMENT_URL="${DEPLOYMENT_URL}" NODE_ENV="${ENVIRONMENT}" node "${SMOKE_DIR}/deployment-smoke-test.js"; then
      print_success "Smoke tests passed on attempt $attempt"
      success=true
      break
    else
      print_warning "Smoke tests failed on attempt $attempt"
      attempt=$((attempt + 1))
    fi
  done

  if [ "$success" = false ]; then
    print_error "Smoke tests failed after $max_attempts attempts"
    return 1
  fi

  return 0
}

run_health_checks_only() {
  print_header "RUNNING HEALTH CHECKS ONLY"

  if DEPLOYMENT_URL="${DEPLOYMENT_URL}" NODE_ENV="${ENVIRONMENT}" node "${SMOKE_DIR}/deployment-smoke-test.js" --health-only; then
    print_success "Health checks passed"
    return 0
  else
    print_error "Health checks failed"
    return 1
  fi
}

generate_report() {
  print_info "Generating test report..."

  local report_dir="${PROJECT_ROOT}/test-results"
  mkdir -p "${report_dir}"

  local timestamp=$(date +"%Y%m%d_%H%M%S")
  local report_file="${report_dir}/smoke-test-report-${timestamp}.json"

  # Create basic report
  cat > "${report_file}" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "${ENVIRONMENT}",
  "deployment_url": "${DEPLOYMENT_URL}",
  "status": "completed",
  "script_version": "1.0.0"
}
EOF

  print_success "Report generated: ${report_file}"
}

cleanup() {
  print_info "Cleaning up..."
  # Add cleanup logic here if needed
}

##############################################################################
# Main Script
##############################################################################

main() {
  local run_health_only=false

  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --health-only)
        run_health_only=true
        shift
        ;;
      --environment=*)
        ENVIRONMENT="${1#*=}"
        shift
        ;;
      --url=*)
        DEPLOYMENT_URL="${1#*=}"
        shift
        ;;
      --timeout=*)
        TIMEOUT="${1#*=}"
        shift
        ;;
      --retries=*)
        RETRIES="${1#*=}"
        shift
        ;;
      --help)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --health-only          Run only health checks"
        echo "  --environment=ENV      Set environment (development/staging/production)"
        echo "  --url=URL              Set deployment URL"
        echo "  --timeout=SECONDS      Set test timeout"
        echo "  --retries=COUNT        Set retry count"
        echo "  --help                 Show this help"
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        exit 1
        ;;
    esac
  done

  # Validate environment
  case $ENVIRONMENT in
    development|staging|production)
      ;;
    *)
      print_error "Invalid environment: $ENVIRONMENT"
      print_error "Valid environments: development, staging, production"
      exit 1
      ;;
  esac

  print_header "DEPLOYMENT SMOKE TEST RUNNER"
  print_info "Environment: ${ENVIRONMENT}"
  print_info "Deployment URL: ${DEPLOYMENT_URL}"
  print_info "Timeout: ${TIMEOUT}s"
  print_info "Retries: ${RETRIES}"

  # Run checks
  check_dependencies
  setup_environment

  # Execute tests
  if [ "$run_health_only" = true ]; then
    if run_health_checks_only; then
      print_success "Health checks completed successfully"
      generate_report
      exit 0
    else
      print_error "Health checks failed"
      exit 1
    fi
  else
    if run_smoke_tests; then
      print_success "All smoke tests passed"
      generate_report
      exit 0
    else
      print_error "Smoke tests failed - deployment may be unstable"
      generate_report
      exit 1
    fi
  fi
}

# Run main function
trap cleanup EXIT
main "$@"