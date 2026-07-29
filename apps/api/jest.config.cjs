module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@pinkora/shared$': '<rootDir>/../../packages/shared/src',
    '^@pinkora/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};
