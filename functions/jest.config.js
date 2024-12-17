/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup/jest.setup.ts"],
  testMatch: [
    "<rootDir>/src/test/endpoints/**/*.test.ts",
    "<rootDir>/src/test/middleware/**/*.test.ts",
  ],
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  testTimeout: 180000,
  maxWorkers: 1,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  silent: true,
  errorOnDeprecated: false,
  testEnvironmentOptions: {
    teardown: { cleanup: true },
  },
};
