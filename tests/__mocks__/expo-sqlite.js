// Mock for expo-sqlite — unit tests run in Node; the real module requires
// a native SQLite build. Business logic tests should inject a db client;
// this mock prevents import errors in test files that import from db/.
module.exports = {
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getFirstSync: jest.fn(() => null),
    getAllSync: jest.fn(() => []),
    closeSync: jest.fn(),
  })),
  SQLiteDatabase: jest.fn(),
};
