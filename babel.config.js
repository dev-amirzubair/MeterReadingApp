module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.using(() => process.env.NODE_ENV);

  const plugins = [];

  // Zod v4 emits `export * as core from "../core/index.js"` (ES2020 namespace
  // re-export) which Hermes' module-to-cjs transform can't handle without this
  // plugin. RN 0.85's babel-preset doesn't enable it by default.
  plugins.push('@babel/plugin-transform-export-namespace-from');

  // react-native-dotenv inlines env literals at babel-transform time, which
  // would defeat Jest's `moduleNameMapper` for `@env`. Only register it for
  // the real Metro build; tests fall back to the `__mocks__/env.js` shim.
  if (!isTest) {
    plugins.push([
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
        verbose: false,
      },
    ]);
  }

  // Reanimated 4 worklets plugin must run last.
  plugins.push('react-native-worklets/plugin');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
