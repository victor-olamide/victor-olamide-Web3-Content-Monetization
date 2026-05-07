#!/bin/bash

##############################################################################
# Concurrent User Load Test Runner Script
# Orchestrates comprehensive load testing with Artillery and Locust
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
BACKEND_URL="${LOAD_TEST_URL:-http://localhost:5000}"
RESULTS_DIR="${SCRIPT_DIR}/test-results"
LOG_FILE="${RESULTS_DIR}/concurrent-load-test.log"

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

cleanup() {
  print_info "Cleaning up..."
  rm -rf "${RESULTS_DIR:?}"/*.tmp 2>/dev/null || true
}

check_dependencies() {
  print_header "Checking Dependencies"
  
  local missing=0
  
  if ! command -v artillery &> /dev/null; then
    print_warning "Artillery not installed. Install with: npm install -g artillery"
    missing=$((missing + 1))
  else
    print_success "Artillery installed: $(artillery --version)"
  fi
  
  if ! command -v locust &> /dev/null; then
    print_warning "Locust not installed. Install with: pip install locust"
    missing=$((missing + 1))
  else
    print_success "Locust installed: $(locust --version)"
  fi
  
  if ! command -v node &> /dev/null; then
    print_error "Node.js not installed"
    missing=$((missing + 1))
  else
    print_success "Node.js installed: $(node --version)"
  fi
  
  if ! command -v python3 &> /dev/null; then
    print_error "Python 3 not installed"
    missing=$((missing + 1))
  else
    print_success "Python 3 installed: $(python3 --version)"
  fi
  
  if [ $missing -gt 0 ]; then
    print_error "Missing $missing required dependencies"
    return 1
  fi
  
  print_success "All dependencies available"
  return 0
}

verify_backend() {
  print_header "Verifying Backend Connectivity"
  
  print_info "Checking backend at: ${BACKEND_URL}"
  
  if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    print_success "Backend is accessible"
    return 0
  else
    print_warning "Backend at ${BACKEND_URL} is not responding"
    print_info "Ensure backend is running before starting load tests"
    if [ "$1" != "--skip-verify" ]; then
      read -p "Continue anyway? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
      fi
    fi
  fi
}

setup_results_directory() {
  print_header "Setting Up Results Directory"
  
  mkdir -p "${RESULTS_DIR}"
  mkdir -p "${RESULTS_DIR}/artillery"
  mkdir -p "${RESULTS_DIR}/locust"
  mkdir -p "${RESULTS_DIR}/metrics"
  
  print_success "Results directory ready: ${RESULTS_DIR}"
}

run_artillery_test() {
  local config_file="$1"
  local test_name=$(basename "$config_file" .yml)
  
  print_header "Running Artillery Load Test: ${test_name}"
  
  local output_file="${RESULTS_DIR}/artillery/${test_name}-$(date +%s).json"
  
  echo "Config: ${config_file}"
  echo "Output: ${output_file}"
  echo "Backend: ${BACKEND_URL}"
  
  artillery run \
    "${config_file}" \
    --output "${output_file}" \
    --target "${BACKEND_URL}" 2>&1 | tee -a "${LOG_FILE}"
  
  if [ $? -eq 0 ]; then
    print_success "Artillery test completed: ${test_name}"
    return 0
  else
    print_error "Artillery test failed: ${test_name}"
    return 1
  fi
}

run_locust_test() {
  local python_file="$1"
  local num_users="$2"
  local spawn_rate="$3"
  local duration="$4"
  local test_name="$5"
  
  print_header "Running Locust Load Test: ${test_name}"
  
  echo "Users: ${num_users}"
  echo "Spawn Rate: ${spawn_rate}/sec"
  echo "Duration: ${duration}s"
  echo "Backend: ${BACKEND_URL}"
  
  locust \
    -f "${python_file}" \
    -u "${num_users}" \
    -r "${spawn_rate}" \
    -t "${duration}s" \
    --headless \
    --host "${BACKEND_URL}" \
    --csv="${RESULTS_DIR}/locust/${test_name}-$(date +%s)" 2>&1 | tee -a "${LOG_FILE}"
  
  if [ $? -eq 0 ]; then
    print_success "Locust test completed: ${test_name}"
    return 0
  else
    print_error "Locust test failed: ${test_name}"
    return 1
  fi
}

run_standard_tests() {
  print_header "Running Standard Concurrent Load Tests"
  
  # Run Artillery concurrent users test
  if [ -f "${SCRIPT_DIR}/concurrent-users-artillery.yml" ]; then
    run_artillery_test "${SCRIPT_DIR}/concurrent-users-artillery.yml" || print_warning "Artillery test encountered issues"
  fi
  
  # Run Locust concurrent users test
  if [ -f "${SCRIPT_DIR}/concurrent-users-locust.py" ]; then
    run_locust_test \
      "${SCRIPT_DIR}/concurrent-users-locust.py" \
      100 \
      3 \
      300 \
      "concurrent-users-100" || print_warning "Locust test encountered issues"
  fi
}

run_stress_test() {
  print_header "Running Stress Test (500 Concurrent Users)"
  
  if [ -f "${SCRIPT_DIR}/concurrent-users-locust.py" ]; then
    run_locust_test \
      "${SCRIPT_DIR}/concurrent-users-locust.py" \
      500 \
      5 \
      600 \
      "stress-test-500" || print_warning "Stress test encountered issues"
  fi
}

run_soak_test() {
  print_header "Running Soak Test (30 Minutes)"
  
  if [ -f "${SCRIPT_DIR}/concurrent-users-locust.py" ]; then
    run_locust_test \
      "${SCRIPT_DIR}/concurrent-users-locust.py" \
      50 \
      2 \
      1800 \
      "soak-test-30min" || print_warning "Soak test encountered issues"
  fi
}

analyze_results() {
  print_header "Analyzing Test Results"
  
  if [ -f "${SCRIPT_DIR}/concurrent-load-test-analyzer.js" ]; then
    node "${SCRIPT_DIR}/concurrent-load-test-analyzer.js" "${RESULTS_DIR}" || \
      print_warning "Analysis encountered issues"
  fi
  
  if [ -f "${SCRIPT_DIR}/concurrent-load-comparator.js" ]; then
    node "${SCRIPT_DIR}/concurrent-load-comparator.js" "${RESULTS_DIR}" || \
      print_warning "Comparison analysis encountered issues"
  fi
}

print_summary() {
  print_header "Test Execution Summary"
  
  echo "Backend URL: ${BACKEND_URL}"
  echo "Results Directory: ${RESULTS_DIR}"
  echo "Log File: ${LOG_FILE}"
  echo ""
  echo "Test Results:"
  ls -lah "${RESULTS_DIR}/" 2>/dev/null | tail -n +2 || echo "No results available"
  echo ""
  print_info "For detailed analysis, check:"
  echo "  • ${RESULTS_DIR}/concurrent-load-test-report.txt"
  echo "  • ${RESULTS_DIR}/concurrent-metrics-report.txt"
  echo "  • ${RESULTS_DIR}/concurrent-load-comparison-report.txt"
}

show_help() {
  cat << EOF
${BOLD}Usage: $0 [OPTIONS]${NC}

${BOLD}Options:${NC}
  --standard       Run standard concurrent load tests (default)
  --stress         Run stress test (500 concurrent users)
  --soak           Run soak test (30 minutes sustained load)
  --all            Run all test suites
  --artillery-only Run only Artillery tests
  --locust-only    Run only Locust tests
  --analyze        Analyze existing results
  --skip-verify    Skip backend connectivity verification
  --help           Show this help message

${BOLD}Examples:${NC}
  $0                           # Run standard tests
  $0 --all                     # Run all test suites
  $0 --stress --analyze        # Run stress test and analyze
  $0 --skip-verify --locust-only # Run Locust tests without backend check

${BOLD}Environment Variables:${NC}
  LOAD_TEST_URL    Backend URL (default: http://localhost:5000)
  
EOF
}

##############################################################################
# Main Execution
##############################################################################

main() {
  local test_mode="standard"
  local skip_verify=0
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --standard)
        test_mode="standard"
        shift
        ;;
      --stress)
        test_mode="stress"
        shift
        ;;
      --soak)
        test_mode="soak"
        shift
        ;;
      --all)
        test_mode="all"
        shift
        ;;
      --artillery-only)
        test_mode="artillery-only"
        shift
        ;;
      --locust-only)
        test_mode="locust-only"
        shift
        ;;
      --analyze)
        test_mode="analyze"
        shift
        ;;
      --ci)
        test_mode="ci"
        skip_verify=1
        shift
        ;;
      --skip-verify)
        skip_verify=1
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
  
  # Print banner
  print_header "CONCURRENT USER LOAD TEST SUITE"
  
  # Change to script directory
  cd "${SCRIPT_DIR}"
  
  # Setup
  setup_results_directory
  
  # Verify dependencies
  if ! check_dependencies; then
    print_error "Please install missing dependencies"
    exit 1
  fi
  
  # Verify backend
  if [ $skip_verify -eq 0 ]; then
    if ! verify_backend; then
      exit 1
    fi
  fi
  
  # Run tests based on mode
  case $test_mode in
    standard)
      run_standard_tests
      ;;
    stress)
      run_stress_test
      ;;
    soak)
      run_soak_test
      ;;
    all)
      run_standard_tests
      run_stress_test
      run_soak_test
      ;;
    artillery-only)
      run_artillery_test "${SCRIPT_DIR}/concurrent-users-artillery.yml"
      ;;
    locust-only)
      run_locust_test \
        "${SCRIPT_DIR}/concurrent-users-locust.py" \
        100 3 300 "concurrent-users-100"
      ;;
    analyze)
      analyze_results
      exit 0
      ;;
    ci)
      run_standard_tests
      ;;
  esac
  
  # Cleanup
  cleanup
  
  # Analyze results
  analyze_results
  
  # Print summary
  print_summary
  
  print_header "Test Suite Completed Successfully"
}

# Execute main function
main "$@"
