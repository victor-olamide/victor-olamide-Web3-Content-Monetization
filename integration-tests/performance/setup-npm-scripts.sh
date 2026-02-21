#!/bin/bash

##############################################################################
# Update Integration Tests Package.json with Load Test Scripts
# Adds npm scripts for easy load test execution
##############################################################################

PACKAGE_JSON="package.json"

# Check if package.json exists
if [ ! -f "$PACKAGE_JSON" ]; then
  echo "Error: package.json not found in current directory"
  exit 1
fi

# Create backup
cp "$PACKAGE_JSON" "$PACKAGE_JSON.backup"
echo "Created backup: $PACKAGE_JSON.backup"

# Update package.json with new scripts
node << 'EOF'
const fs = require('fs');
const path = require('path');

const packagePath = './package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Add new scripts for load testing
const loadTestScripts = {
  "test:load": "cd performance && ./run-concurrent-load-tests.sh --standard",
  "test:load:stress": "cd performance && ./run-concurrent-load-tests.sh --stress",
  "test:load:soak": "cd performance && ./run-concurrent-load-tests.sh --soak",
  "test:load:all": "cd performance && ./run-concurrent-load-tests.sh --all",
  "test:load:analyze": "cd performance && node concurrent-load-test-analyzer.js ../test-results",
  "test:load:compare": "cd performance && node concurrent-load-comparator.js ../test-results",
  "test:load:report": "cd performance && node load-test-reporter.js ../test-results",
  "test:load:baseline": "cd performance && node baseline-calculator.js --set",
  "test:load:config": "cd performance && node load-test-configurator.js --wizard",
  "test:load:validate": "cd performance && node load-test-integration.js ../test-results"
};

// Merge with existing scripts
pkg.scripts = { ...pkg.scripts, ...loadTestScripts };

// Write back to file
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✓ package.json updated with load test scripts');
console.log('\nAvailable npm scripts:');
for (const [script, cmd] of Object.entries(loadTestScripts)) {
  console.log(`  npm run ${script}`);
}

EOF

echo ""
echo "✅ Integration complete!"
echo ""
echo "Load test npm scripts are now available:"
echo "  npm run test:load              # Run standard concurrent user tests"
echo "  npm run test:load:stress       # Run stress test (500 users)"
echo "  npm run test:load:soak         # Run soak test (30 minutes)"
echo "  npm run test:load:all          # Run all test suites"
echo "  npm run test:load:analyze      # Analyze test results"
echo "  npm run test:load:compare      # Compare multiple test runs"
echo "  npm run test:load:report       # Generate HTML/JSON reports"
echo "  npm run test:load:baseline     # Set baseline from results"
echo "  npm run test:load:config       # Interactive configuration"
echo "  npm run test:load:validate     # Validate against SLA"
