module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/scenarios/**/*.test.js'],
  testTimeout: 120000,
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['./reporter.js', {}]
  ],
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  maxWorkers: 1
};
