// Jest configuration for smoke tests (#195)
module.exports = {
  displayName: 'Smoke Tests',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.js'],
  testMatch: [
    '<rootDir>/smoke/**/*.test.js',
    '<rootDir>/smoke/**/*.spec.js',
  ],
  collectCoverageFrom: [
    'smoke/**/*.js',
    '!**/node_modules/**',
    '!**/test-results/**',
  ],
  coverageDirectory: 'coverage/smoke',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  maxWorkers: 2,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'smoke-junit.xml',
    }],
  ],
};
