import {
  aggregatedMonthlyUsage,
  applyPeriod,
  summarize,
  toBarPoints,
  toYearlyPoints,
} from './chartData';
import type { MonthlyUsage, Reading } from '../../types/domain';

const bill = (
  meterId: string,
  date: string,
  value: number,
): Reading => ({
  id: `${meterId}-${date}`,
  meterId,
  readingValue: value,
  readingDate: date,
  readingType: 'BILL',
  imagePath: null,
  ocrDetectedValue: null,
  notes: null,
  createdAt: '2025-01-01T00:00:00.000Z',
});

const usage = (month: string, units: number): MonthlyUsage => ({
  month,
  units,
  startDate: `${month}-01`,
  endDate: `${month}-28`,
  startReading: 0,
  endReading: units,
});

describe('aggregatedMonthlyUsage', () => {
  it('returns empty when no readings', () => {
    expect(aggregatedMonthlyUsage([], null)).toEqual([]);
    expect(aggregatedMonthlyUsage([], 'm1')).toEqual([]);
  });

  it('computes per-meter usage when meterId is given', () => {
    const usages = aggregatedMonthlyUsage(
      [
        bill('m1', '2025-01-15', 1000),
        bill('m1', '2025-02-15', 1200),
        bill('m2', '2025-01-15', 5000),
        bill('m2', '2025-02-15', 5500),
      ],
      'm1',
    );
    expect(usages.map(u => u.units)).toEqual([200]);
  });

  it('sums units across meters when meterId is null', () => {
    const usages = aggregatedMonthlyUsage(
      [
        bill('m1', '2025-01-15', 1000),
        bill('m1', '2025-02-15', 1200),
        bill('m2', '2025-01-15', 5000),
        bill('m2', '2025-02-15', 5500),
      ],
      null,
    );
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      month: '2025-02',
      units: 700, // 200 (m1) + 500 (m2)
    });
  });

  it('aggregates the date-range envelope when summing meters', () => {
    const usages = aggregatedMonthlyUsage(
      [
        // m1: jan 15 → feb 15
        bill('m1', '2025-01-15', 1000),
        bill('m1', '2025-02-15', 1200),
        // m2: jan 5 → feb 28 (wider range)
        bill('m2', '2025-01-05', 5000),
        bill('m2', '2025-02-28', 5500),
      ],
      null,
    );
    expect(usages[0].startDate).toBe('2025-01-05'); // earliest start
    expect(usages[0].endDate).toBe('2025-02-28'); // latest end
  });

  it('returns months sorted ascending', () => {
    const usages = aggregatedMonthlyUsage(
      [
        bill('m1', '2024-11-15', 800),
        bill('m1', '2025-02-15', 1200),
        bill('m1', '2024-12-15', 900),
        bill('m1', '2025-01-15', 1000),
      ],
      null,
    );
    expect(usages.map(u => u.month)).toEqual([
      '2024-12',
      '2025-01',
      '2025-02',
    ]);
  });
});

describe('applyPeriod', () => {
  const usages = [
    usage('2025-01', 100),
    usage('2025-02', 200),
    usage('2025-03', 150),
    usage('2025-04', 300),
    usage('2025-05', 250),
    usage('2025-06', 175),
  ];

  it('returns full list for ALL', () => {
    expect(applyPeriod(usages, 'ALL')).toEqual(usages);
  });

  it('returns last 3 months for 3M', () => {
    expect(applyPeriod(usages, '3M').map(u => u.month)).toEqual([
      '2025-04',
      '2025-05',
      '2025-06',
    ]);
  });

  it('returns last 6 months for 6M', () => {
    expect(applyPeriod(usages, '6M')).toEqual(usages);
  });

  it('returns last 12 months for 12M (or all if shorter)', () => {
    expect(applyPeriod(usages, '12M')).toEqual(usages);
  });
});

describe('toBarPoints', () => {
  it('converts to value/label/month tuples with localised month label', () => {
    const points = toBarPoints([usage('2025-03', 250), usage('2025-04', 175)]);
    expect(points).toEqual([
      { value: 250, label: 'Mar', month: '2025-03' },
      { value: 175, label: 'Apr', month: '2025-04' },
    ]);
  });
});

describe('toYearlyPoints', () => {
  it('aggregates by year and sorts ascending', () => {
    const points = toYearlyPoints([
      usage('2024-11', 100),
      usage('2024-12', 200),
      usage('2025-01', 150),
      usage('2025-02', 300),
    ]);
    expect(points).toEqual([
      { year: '2024', units: 300 },
      { year: '2025', units: 450 },
    ]);
  });

  it('handles empty input', () => {
    expect(toYearlyPoints([])).toEqual([]);
  });
});

describe('summarize', () => {
  it('returns zeroed result on empty input', () => {
    expect(summarize([])).toEqual({
      totalUnits: 0,
      averageUnits: null,
      highest: null,
      lowest: null,
      monthsCount: 0,
    });
  });

  it('computes total / average / highest / lowest', () => {
    const result = summarize([
      usage('2025-01', 100),
      usage('2025-02', 200),
      usage('2025-03', 150),
    ]);
    expect(result.totalUnits).toBe(450);
    expect(result.averageUnits).toBe(150);
    expect(result.highest?.month).toBe('2025-02');
    expect(result.lowest?.month).toBe('2025-01');
    expect(result.monthsCount).toBe(3);
  });
});
