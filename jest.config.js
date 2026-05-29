/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  // Mock native modules that require a real device/simulator
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

  // Coverage targets pure business logic only.
  // Screens, navigation and UI components require a simulator — those are
  // covered by Maestro E2E tests locally, not unit coverage thresholds.
  // Infrastructure files (logging, network) are excluded — they rely on
  // platform APIs (expo-file-system, fetch) that can't run in Jest.
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/db/queries/**/*.ts",
    "!src/lib/logger.ts",
    "!src/lib/logUtils.ts",
    "!src/lib/repoLog.ts",
    "!src/lib/globalErrorHandler.ts",
    "!src/lib/brief/weather.ts",
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
  // passWithNoTests removed — tests now exist and thresholds must be met
  coverageReporters: ["text", "lcov"],

  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/__mocks__/"],

  // Transform via babel-jest with the Expo preset
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },

  // Allow Jest to transform Expo/React Native packages (they ship as ESM)
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|tailwindcss|react-native-worklets)",
  ],
};
