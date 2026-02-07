// Global test setup
require('dotenv').config();

// Set longer timeout for blockchain operations
jest.setTimeout(120000);

// Global test hooks
beforeAll(() => {
  console.log('🚀 Starting integration test suite...');
});

afterAll(() => {
  console.log('✅ Integration test suite completed');
});
