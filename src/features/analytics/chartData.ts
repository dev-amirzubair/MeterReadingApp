import { format, parseISO } from 'date-fns';
import type { MonthlyUsage, Reading } from '../../types/domain';
import { monthlyUsageFromBillReadings } from '../../utils/usage';

export type AnalyticsPeriod = '3M' | '6M' | '12M' | 'ALL';

export const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '3M', label: '3 Months' },
  { value: '6M', label: '6 Months' },
  { value: '12M', label: '12 Months' },
  { value: 'ALL', label: 'All time' },
];

const periodMonths = (p: AnalyticsPeriod): number | null => {
  switch (p) {
    case '3M':
      return 3;
    case '6M':
      return 6;
    case '12M':
      return 12;
    default:
      return null;
  }
};

/**
 * Combines BILL readings across the given meters into a single per-month
 * usage timeline (units summed when multiple meters report the same month).
 *
 * `meterId` may be a specific meter id, or `null` to aggregate across all.
 */
export function aggregatedMonthlyUsage(
  bills: Reading[],
  meterId: string | null,
): MonthlyUsage[] {
  const filtered = meterId
    ? bills.filter(b => b.meterId === meterId)
    : bills;

  if (meterId) {
    return monthlyUsageFromBillReadings(filtered);
  }

  // Group by meter, compute per-meter usages, then sum by month.
  const byMeter = new Map<string, Reading[]>();
  for (const r of filtered) {
    const list = byMeter.get(r.meterId) ?? [];
    list.push(r);
    byMeter.set(r.meterId, list);
  }

  const monthMap = new Map<string, MonthlyUsage>();
  for (const meterBills of byMeter.values()) {
    for (const u of monthlyUsageFromBillReadings(meterBills)) {
      const existing = monthMap.get(u.month);
      if (existing) {
        existing.units += u.units;
        // Keep the earliest startDate / latest endDate for display range.
        if (u.startDate < existing.startDate) {
          existing.startDate = u.startDate;
        }
        if (u.endDate > existing.endDate) {
          existing.endDate = u.endDate;
        }
      } else {
        monthMap.set(u.month, { ...u });
      }
    }
  }

  return Array.from(monthMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
}

/**
 * Returns the last N months of usages (or all of them when period = 'ALL').
 */
export function applyPeriod(
  usages: MonthlyUsage[],
  period: AnalyticsPeriod,
): MonthlyUsage[] {
  const months = periodMonths(period);
  if (!months) {
    return usages;
  }
  return usages.slice(-months);
}

export interface BarPoint {
  value: number;
  label: string;
  /** Full ISO YYYY-MM, useful for tooltips */
  month: string;
}

export function toBarPoints(usages: MonthlyUsage[]): BarPoint[] {
  return usages.map(u => ({
    value: u.units,
    label: format(parseISO(`${u.month}-01`), 'MMM'),
    month: u.month,
  }));
}

export interface YearlyPoint {
  year: string;
  units: number;
}

/**
 * Aggregates a usage timeline into per-year totals.
 */
export function toYearlyPoints(usages: MonthlyUsage[]): YearlyPoint[] {
  const map = new Map<string, number>();
  for (const u of usages) {
    const year = u.month.slice(0, 4);
    map.set(year, (map.get(year) ?? 0) + u.units);
  }
  return Array.from(map.entries())
    .map(([year, units]) => ({ year, units }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

export interface AnalyticsSummary {
  totalUnits: number;
  averageUnits: number | null;
  highest: MonthlyUsage | null;
  lowest: MonthlyUsage | null;
  monthsCount: number;
}

export function summarize(usages: MonthlyUsage[]): AnalyticsSummary {
  if (usages.length === 0) {
    return {
      totalUnits: 0,
      averageUnits: null,
      highest: null,
      lowest: null,
      monthsCount: 0,
    };
  }
  const total = usages.reduce((acc, u) => acc + u.units, 0);
  const average = Math.round(total / usages.length);
  const highest = usages.reduce((best, u) =>
    u.units > best.units ? u : best,
  );
  const lowest = usages.reduce((best, u) =>
    u.units < best.units ? u : best,
  );
  return {
    totalUnits: total,
    averageUnits: average,
    highest,
    lowest,
    monthsCount: usages.length,
  };
}
