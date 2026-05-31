import { format, parseISO } from 'date-fns';
import type { MonthlyUsage, Reading } from '../types/domain';

/**
 * Builds a list of MonthlyUsage entries from BILL readings.
 *
 * For a given meter:
 *   monthly_usage[i] = bill_reading[i+1].value - bill_reading[i].value
 * The "month" key uses the *end* reading's YYYY-MM, since that's the bill cycle
 * that just closed.
 *
 * CASUAL readings are intentionally ignored — see spec.
 *
 * Caller is expected to pass BILL readings sorted ascending by readingDate.
 * If you have all readings, use `monthlyUsageFromReadings` instead.
 */
export function monthlyUsageFromBillReadings(
  bills: readonly Reading[],
): MonthlyUsage[] {
  if (bills.length < 2) {
    return [];
  }
  const sorted = [...bills].sort((a, b) =>
    a.readingDate.localeCompare(b.readingDate),
  );
  const usages: MonthlyUsage[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const units = Math.max(0, curr.readingValue - prev.readingValue);
    usages.push({
      month: format(parseISO(curr.readingDate), 'yyyy-MM'),
      units,
      startDate: prev.readingDate,
      endDate: curr.readingDate,
      startReading: prev.readingValue,
      endReading: curr.readingValue,
    });
  }
  return usages;
}

export function monthlyUsageFromReadings(
  readings: readonly Reading[],
): MonthlyUsage[] {
  return monthlyUsageFromBillReadings(
    readings.filter(r => r.readingType === 'BILL'),
  );
}

/**
 * `MonthlyUsage` for the most recent closed bill cycle, or null.
 */
export function currentMonthUsage(
  usages: MonthlyUsage[],
): MonthlyUsage | null {
  if (usages.length === 0) {
    return null;
  }
  return [...usages].sort((a, b) => b.month.localeCompare(a.month))[0];
}

export function previousMonthUsage(
  usages: MonthlyUsage[],
): MonthlyUsage | null {
  if (usages.length < 2) {
    return null;
  }
  return [...usages].sort((a, b) => b.month.localeCompare(a.month))[1];
}

export function averageMonthlyUnits(usages: MonthlyUsage[]): number | null {
  if (usages.length === 0) {
    return null;
  }
  const sum = usages.reduce((acc, u) => acc + u.units, 0);
  return Math.round(sum / usages.length);
}

export function highestMonth(usages: MonthlyUsage[]): MonthlyUsage | null {
  if (usages.length === 0) {
    return null;
  }
  return usages.reduce((best, u) => (u.units > best.units ? u : best));
}

export function lowestMonth(usages: MonthlyUsage[]): MonthlyUsage | null {
  if (usages.length === 0) {
    return null;
  }
  return usages.reduce((best, u) => (u.units < best.units ? u : best));
}

/**
 * Difference between a CASUAL reading and the most recent BILL reading.
 * Used for the "X units consumed since last bill reading" line.
 */
export function unitsSinceLastBill(
  bills: readonly Reading[],
  casual: Reading,
): number | null {
  if (bills.length === 0) {
    return null;
  }
  const sorted = [...bills].sort((a, b) =>
    a.readingDate.localeCompare(b.readingDate),
  );
  const lastBill = sorted[sorted.length - 1];
  return Math.max(0, casual.readingValue - lastBill.readingValue);
}
