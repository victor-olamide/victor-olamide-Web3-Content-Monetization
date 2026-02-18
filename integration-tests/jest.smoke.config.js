// Jest configuration for smoke tests
module.exports = {
  displayName: 'Smoke Tests',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.js'],
  testMatch: [
    '<rootDir>/api/smoke/**/*.test.js',
    '<rootDir>/e2e/smoke/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'api/**/*.js',
    'e2e/**/*.js',
    '!**/node_modules/**',
    '!**/test-results/**'
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
      outputName: 'smoke-junit.xml'
    }]
  ]
};