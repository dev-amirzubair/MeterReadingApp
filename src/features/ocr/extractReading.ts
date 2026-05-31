import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface OcrCandidate {
  /** Parsed numeric value */
  value: number;
  /** Original token from the OCR text (preserves leading zeros, decimal points) */
  rawToken: string;
}

export interface OcrResult {
  rawText: string;
  candidates: OcrCandidate[];
  /** The chosen suggested reading, or `null` if nothing plausible was found. */
  suggestedValue: number | null;
}

/**
 * Heuristic: a meter reading is usually 3 to 7 digits, optionally with a
 * single decimal portion of 1-2 digits. Anything shorter is more likely to
 * be a date/timestamp/serial fragment.
 */
const TOKEN_RE = /(\d{3,7}(?:\.\d{1,2})?)/g;
const MIN_VALUE = 100;
const MAX_VALUE = 9_999_999;

/**
 * Extracts plausible meter-reading candidates from the recognised text.
 *
 * Selection rules (per the spec):
 *   1. Tokenise digits (with optional decimal).
 *   2. Drop tokens outside [MIN_VALUE, MAX_VALUE].
 *   3. Suggest the largest remaining numeric value.
 *
 * Returning the full candidate list lets the UI show a "didn't pick the
 * right one?" choice list later.
 */
export function pickReadingFromText(rawText: string): OcrResult {
  const candidates: OcrCandidate[] = [];
  const seen = new Set<string>();
  for (const match of rawText.matchAll(TOKEN_RE)) {
    const token = match[1];
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    const value = Number(token);
    if (
      Number.isFinite(value) &&
      value >= MIN_VALUE &&
      value <= MAX_VALUE
    ) {
      candidates.push({ value, rawToken: token });
    }
  }

  candidates.sort((a, b) => b.value - a.value);
  return {
    rawText,
    candidates,
    suggestedValue: candidates[0]?.value ?? null,
  };
}

/**
 * Runs OCR on the file at `imageUri` and applies the same pickReadingFromText
 * heuristic to return a suggested numeric reading.
 */
export async function extractReadingFromImage(
  imageUri: string,
): Promise<OcrResult> {
  const result = await TextRecognition.recognize(imageUri);
  return pickReadingFromText(result.text);
}
