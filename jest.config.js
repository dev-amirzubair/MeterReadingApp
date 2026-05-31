module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/env.js',
  },
  transformIgnorePatterns: [
    // Allow Jest to transform our native-module ESM packages so jest's mocks
    // can intercept their exports cleanly. The default preset's pattern
    // already excludes most rn packages — extend with the ones we touch.
    'node_modules/(?!(?:react-native|@react-native|@react-navigation|react-native-reanimated|react-native-worklets|react-native-gesture-handler|@notifee|@react-native-ml-kit)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
