// NativeWind passthrough — className styling is irrelevant in unit tests.
module.exports = {
  styled: (Component) => Component,
  useColorScheme: jest.fn(() => ({ colorScheme: "light" })),
};
