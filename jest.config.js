/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-sqlite$": "<rootDir>/tests/__mocks__/expo-sqlite.js",
    "^expo-secure-store$": "<rootDir>/tests/__mocks__/expo-secure-store.js",
    "^expo-crypto$": "<rootDir>/tests/__mocks__/expo-crypto.js",
    "^nativewind$": "<rootDir>/tests/__mocks__/nativewind.js",
    "^@react-native-async-storage/async-storage$":
      "<rootDir>/tests/__mocks__/@react-native-async-storage/async-storage.js",
    "^expo-calendar$": "<rootDir>/tests/__mocks__/expo-calendar.js",
  },

  // Coverage: pure business logic in src/lib. UI/screens/repos need simulator or integration mocks.
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/db/queries/**/*.ts",
    "!src/lib/logger.ts",
    "!src/lib/logUtils.ts",
    "!src/lib/repoLog.ts",
    "!src/lib/globalErrorHandler.ts",
    "!src/lib/haptics.ts",
    "!src/lib/**/*.types.ts",
    "!src/lib/people/naturalLanguageParser.api.ts",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "\\.test\\.(ts|tsx)$", "/__mocks__/"],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  coverageReporters: ["text", "lcov"],

  testMatch: [
    "**/__tests__/**/*.{ts,tsx}",
    "**/*.{test,spec}.{ts,tsx}",
    "**/tests/integration/**/*.integration.test.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/tests/__mocks__/"],

  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },

  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|tailwindcss|react-native-worklets)",
  ],
};
