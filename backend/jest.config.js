module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 10000,
  verbose: true,
  collectCoverage: false,
  setupFilesAfterEnv: [],
  maxWorkers: 4,
  roots: ['<rootDir>'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/integration-tests/',
    '/tests/e2e/',
    '/tests/performance/',
    '/tests/security/',
    '/tests/smoke/'
  ]
};