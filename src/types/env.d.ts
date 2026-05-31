/**
 * Module declarations for `react-native-dotenv`.
 *
 * Each variable is the bill-check URL template for one DISCO. The literal
 * `{consumer}` in the value will be replaced by the user's consumer number
 * at runtime (see `features/bill-checker/buildBillUrl.ts`).
 */
declare module '@env' {
  export const LESCO_URL: string | undefined;
  export const FESCO_URL: string | undefined;
  export const GEPCO_URL: string | undefined;
  export const MEPCO_URL: string | undefined;
  export const IESCO_URL: string | undefined;
  export const PESCO_URL: string | undefined;
  export const HESCO_URL: string | undefined;
  export const SEPCO_URL: string | undefined;
  export const QESCO_URL: string | undefined;
  export const TESCO_URL: string | undefined;
  export const KE_URL: string | undefined;
  export const OTHER_URL: string | undefined;
}
