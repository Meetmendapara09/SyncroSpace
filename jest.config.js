
module.exports = {
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '^uuid$': require.resolve('uuid'),
    },
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)',
    ],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
            },
        }],
    },
};
