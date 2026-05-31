// Test stub for `@env` (react-native-dotenv). These are deterministic so the
// build-bill-url tests don't depend on whatever the developer happens to have
// in their .env file.
module.exports = {
  LESCO_URL: 'https://bill.example.com/lesco?refno={consumer}',
  FESCO_URL: 'https://bill.example.com/fesco?refno={consumer}',
  GEPCO_URL: 'https://bill.example.com/gepco?refno={consumer}',
  MEPCO_URL: 'https://bill.example.com/mepco?refno={consumer}',
  IESCO_URL: 'https://bill.example.com/iesco?refno={consumer}',
  PESCO_URL: 'https://bill.example.com/pesco?refno={consumer}',
  HESCO_URL: 'https://bill.example.com/hesco?refno={consumer}',
  SEPCO_URL: 'https://bill.example.com/sepco?refno={consumer}',
  QESCO_URL: 'https://bill.example.com/qesco?refno={consumer}',
  TESCO_URL: 'https://bill.example.com/tesco?refno={consumer}',
  KE_URL: 'https://bill.example.com/ke?account={consumer}',
  // Intentionally missing so the test suite can verify the missing-template path.
  OTHER_URL: undefined,
};
