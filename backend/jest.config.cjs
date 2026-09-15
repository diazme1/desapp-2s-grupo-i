module.exports = {
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
  testEnvironment: 'node',
  testTimeout: 120_000,
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
};
