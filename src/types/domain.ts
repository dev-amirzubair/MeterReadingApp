/**
 * Core domain types shared across the app.
 */

export type Disco =
  | 'LESCO'
  | 'FESCO'
  | 'GEPCO'
  | 'MEPCO'
  | 'IESCO'
  | 'PESCO'
  | 'HESCO'
  | 'SEPCO'
  | 'QESCO'
  | 'TESCO'
  | 'KE'
  | 'OTHER';

export const DISCOS: { value: Disco; label: string; region: string }[] = [
  { value: 'LESCO', label: 'LESCO', region: 'Lahore Electric Supply Company' },
  { value: 'FESCO', label: 'FESCO', region: 'Faisalabad Electric Supply Company' },
  { value: 'GEPCO', label: 'GEPCO', region: 'Gujranwala Electric Power Company' },
  { value: 'MEPCO', label: 'MEPCO', region: 'Multan Electric Power Company' },
  { value: 'IESCO', label: 'IESCO', region: 'Islamabad Electric Supply Company' },
  { value: 'PESCO', label: 'PESCO', region: 'Peshawar Electric Supply Company' },
  { value: 'HESCO', label: 'HESCO', region: 'Hyderabad Electric Supply Company' },
  { value: 'SEPCO', label: 'SEPCO', region: 'Sukkur Electric Power Company' },
  { value: 'QESCO', label: 'QESCO', region: 'Quetta Electric Supply Company' },
  { value: 'TESCO', label: 'TESCO', region: 'Tribal Areas Electric Supply Company' },
  { value: 'KE',    label: 'K-Electric', region: 'Karachi (K-Electric)' },
  { value: 'OTHER', label: 'Other',  region: 'Other / Unlisted' },
];

export type ReadingType = 'BILL' | 'CASUAL';

export interface Meter {
  id: string;
  meterName: string;
  consumerNumber: string;
  disco: Disco;
  createdAt: string; // ISO 8601
}

/**
 * Reading captured against a meter.
 *
 * - `readingType = BILL`: official monthly bill reading. Used for usage math.
 * - `readingType = CASUAL`: informational reading, never affects bill math.
 *
 * `imagePath` may also point to the OCR source image for audit. We store
 * `ocrDetectedValue` separately from `readingValue` so users can later see
 * what OCR thought vs. what they corrected to. (Slice deferred.)
 */
export interface Reading {
  id: string;
  meterId: string;
  readingValue: number;
  readingDate: string; // ISO 8601 (date)
  readingType: ReadingType;
  imagePath?: string | null;
  ocrDetectedValue?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface MonthlyUsage {
  /** YYYY-MM */
  month: string;
  /** units consumed during this month (BILL deltas only) */
  units: number;
  /** the BILL reading value at month end */
  endReading: number;
  /** the BILL reading value at the start of the month (previous BILL) */
  startReading: number;
  startDate: string;
  endDate: string;
}

export interface MeterStats {
  totalMeters: number;
  currentMonthUnits: number | null;
  previousMonthUnits: number | null;
  averageMonthlyUnits: number | null;
  highestMonth: MonthlyUsage | null;
  lowestMonth: MonthlyUsage | null;
  lastReading: Reading | null;
}
