// Jest configuration for API integration tests
module.exports = {
  displayName: 'API Integration Tests',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.js'],
  testMatch: [
    '<rootDir>/api/**/*.test.js',
    '<rootDir>/api/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'api/**/*.js',
    '!**/node_modules/**',
    '!**/test-results/**'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 4,
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'API Integration Test Report',
      outputPath: 'test-results/api-report.html'
    }],
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'api-junit.xml'
    }]
  ]
};