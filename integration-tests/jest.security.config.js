// Jest configuration for security tests
module.exports = {
  displayName: 'Security Tests',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.js'],
  testMatch: [
    '<rootDir>/api/security/**/*.test.js',
    '<rootDir>/e2e/security/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'api/**/*.js',
    'e2e/**/*.js',
    '!**/node_modules/**',
    '!**/test-results/**'
  ],
  coverageDirectory: 'coverage/security',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 120000,
  verbose: true,
  forceExit: true,
  maxWorkers: 1, // Run security tests sequentially
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'security-junit.xml'
    }]
  ]
};