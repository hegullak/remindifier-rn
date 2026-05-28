// Mock for expo-crypto — crypto.randomUUID() is available in Node 19+,
// but expo-crypto wraps native APIs. Fall back to Node's built-in.
const { randomUUID } = require("node:crypto");

module.exports = {
  randomUUID: jest.fn(() => randomUUID()),
  digestStringAsync: jest.fn(() => Promise.resolve("mocked-hash")),
  CryptoDigestAlgorithm: { SHA256: "SHA-256", SHA512: "SHA-512" },
};
