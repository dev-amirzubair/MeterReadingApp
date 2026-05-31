module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    // Build artefacts / generated bundles - never lint these.
    'tmp/',
    'coverage/',
    'android/',
    'ios/',
    '**/build/',
    '**/.cxx/',
    '**/dist/',
    '**/*.bundle',
    '**/*.bundle.js',
    // Docs site is plain HTML/MD; ESLint has no business there.
    'docs/',
    // Patches are unified-diff text, not JS.
    'patches/',
  ],
};
