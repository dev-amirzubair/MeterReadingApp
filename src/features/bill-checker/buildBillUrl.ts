import {
  FESCO_URL,
  GEPCO_URL,
  HESCO_URL,
  IESCO_URL,
  KE_URL,
  LESCO_URL,
  MEPCO_URL,
  OTHER_URL,
  PESCO_URL,
  QESCO_URL,
  SEPCO_URL,
  TESCO_URL,
} from '@env';
import type { Disco } from '../../types/domain';

/**
 * Map each DISCO code → its env-var URL template.
 *
 * Only the env keys are referenced; the actual URLs live in `.env`. This
 * keeps the source tree free of hard-coded URLs while still giving the rest
 * of the app a typed lookup.
 */
const TEMPLATES: Record<Disco, string | undefined> = {
  LESCO: LESCO_URL,
  FESCO: FESCO_URL,
  GEPCO: GEPCO_URL,
  MEPCO: MEPCO_URL,
  IESCO: IESCO_URL,
  PESCO: PESCO_URL,
  HESCO: HESCO_URL,
  SEPCO: SEPCO_URL,
  QESCO: QESCO_URL,
  TESCO: TESCO_URL,
  KE: KE_URL,
  OTHER: OTHER_URL,
};

export class BillUrlError extends Error {}

/**
 * Returns the bill-check URL for the given DISCO + consumer number, or
 * throws `BillUrlError` when the env template is missing/invalid.
 *
 * Replacement rules:
 *   - `{consumer}` → URL-encoded consumer number (whitespace stripped)
 */
export function buildBillUrl(disco: Disco, consumerNumber: string): string {
  const template = TEMPLATES[disco];
  if (!template || template.trim().length === 0) {
    throw new BillUrlError(
      `No bill-check URL configured for ${disco}. ` +
        `Set ${disco}_URL in your .env file and rebuild.`,
    );
  }
  const trimmed = consumerNumber.replace(/\s+/g, '');
  return template.replace(/\{consumer\}/g, encodeURIComponent(trimmed));
}

/**
 * Returns the set of DISCO codes that currently have a non-empty template.
 * Useful for the picker so we can mark unsupported DISCOs.
 */
export function configuredDiscos(): Disco[] {
  return (Object.entries(TEMPLATES) as [Disco, string | undefined][])
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([code]) => code);
}
