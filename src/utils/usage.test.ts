import {
  averageMonthlyUnits,
  currentMonthUsage,
  highestMonth,
  lowestMonth,
  monthlyUsageFromBillReadings,
  monthlyUsageFromReadings,
  previousMonthUsage,
  unitsSinceLastBill,
} from './usage';
import type { Reading } from '../types/domain';

const reading = (
  partial: Partial<Reading> & Pick<Reading, 'readingValue' | 'readingDate'>,
): Reading => ({
  id: partial.id ?? `r-${partial.readingDate}-${partial.readingValue}`,
  meterId: partial.meterId ?? 'm1',
  readingValue: partial.readingValue,
  readingDate: partial.readingDate,
  readingType: partial.readingType ?? 'BILL',
  imagePath: null,
  ocrDetectedValue: null,
  notes: null,
  createdAt: '2025-01-01T00:00:00.000Z',
});

describe('monthlyUsageFromBillReadings', () => {
  it('returns [] for empty input', () => {
    expect(monthlyUsageFromBillReadings([])).toEqual([]);
  });

  it('returns [] for a single reading (no delta possible)', () => {
    expect(
      monthlyUsageFromBillReadings([
        reading({ readingValue: 1000, readingDate: '2025-01-15' }),
      ]),
    ).toEqual([]);
  });

  it('computes the delta between two BILL readings', () => {
    const usages = monthlyUsageFromBillReadings([
      reading({ readingValue: 1000, readingDate: '2025-01-15' }),
      reading({ readingValue: 1200, readingDate: '2025-02-15' }),
    ]);
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      month: '2025-02',
      units: 200,
      startReading: 1000,
      endReading: 1200,
      startDate: '2025-01-15',
      endDate: '2025-02-15',
    });
  });

  it('chains multiple deltas across months', () => {
    const usages = monthlyUsageFromBillReadings([
      reading({ readingValue: 1000, readingDate: '2025-01-15' }),
      reading({ readingValue: 1200, readingDate: '2025-02-15' }),
      reading({ readingValue: 1450, readingDate: '2025-03-15' }),
    ]);
    expect(usages.map(u => u.units)).toEqual([200, 250]);
    expect(usages.map(u => u.month)).toEqual(['2025-02', '2025-03']);
  });

  it('sorts unsorted input by readingDate before computing deltas', () => {
    const usages = monthlyUsageFromBillReadings([
      reading({ readingValue: 1450, readingDate: '2025-03-15' }),
      reading({ readingValue: 1000, readingDate: '2025-01-15' }),
      reading({ readingValue: 1200, readingDate: '2025-02-15' }),
    ]);
    expect(usages.map(u => u.units)).toEqual([200, 250]);
  });

  it('clamps negative deltas to 0 (handles meter rollovers / bad data)', () => {
    const usages = monthlyUsageFromBillReadings([
      reading({ readingValue: 1500, readingDate: '2025-01-15' }),
      reading({ readingValue: 800, readingDate: '2025-02-15' }),
    ]);
    expect(usages[0].units).toBe(0);
  });
});

describe('monthlyUsageFromReadings', () => {
  it('ignores CASUAL readings', () => {
    const usages = monthlyUsageFromReadings([
      reading({ readingValue: 1000, readingDate: '2025-01-15' }),
      reading({
        readingValue: 1100,
        readingDate: '2025-02-01',
        readingType: 'CASUAL',
      }),
      reading({ readingValue: 1200, readingDate: '2025-02-15' }),
    ]);
    expect(usages).toHaveLength(1);
    expect(usages[0].units).toBe(200);
  });
});

describe('current/previousMonthUsage', () => {
  const usages = [
    {
      month: '2025-01',
      units: 100,
      startDate: '2024-12-15',
      endDate: '2025-01-15',
      startReading: 0,
      endReading: 100,
    },
    {
      month: '2025-02',
      units: 200,
      startDate: '2025-01-15',
      endDate: '2025-02-15',
      startReading: 100,
      endReading: 300,
    },
    {
      month: '2025-03',
      units: 150,
      startDate: '2025-02-15',
      endDate: '2025-03-15',
      startReading: 300,
      endReading: 450,
    },
  ];

  it('returns the highest-keyed month for current', () => {
    expect(currentMonthUsage(usages)?.month).toBe('2025-03');
  });

  it('returns the second-highest-keyed month for previous', () => {
    expect(previousMonthUsage(usages)?.month).toBe('2025-02');
  });

  it('returns null when nothing to compare', () => {
    expect(currentMonthUsage([])).toBeNull();
    expect(previousMonthUsage([])).toBeNull();
    expect(previousMonthUsage([usages[0]])).toBeNull();
  });
});

describe('aggregations', () => {
  const usages = [
    {
      month: '2025-01',
      units: 100,
      startDate: '',
      endDate: '',
      startReading: 0,
      endReading: 0,
    },
    {
      month: '2025-02',
      units: 200,
      startDate: '',
      endDate: '',
      startReading: 0,
      endReading: 0,
    },
    {
      month: '2025-03',
      units: 150,
      startDate: '',
      endDate: '',
      startReading: 0,
      endReading: 0,
    },
  ];

  it('averageMonthlyUnits rounds to nearest int', () => {
    expect(averageMonthlyUnits(usages)).toBe(150); // (100+200+150)/3 = 150
    expect(averageMonthlyUnits([{ ...usages[0], units: 1 }])).toBe(1);
    expect(averageMonthlyUnits([])).toBeNull();
  });

  it('highestMonth picks the largest', () => {
    expect(highestMonth(usages)?.units).toBe(200);
    expect(highestMonth([])).toBeNull();
  });

  it('lowestMonth picks the smallest', () => {
    expect(lowestMonth(usages)?.units).toBe(100);
    expect(lowestMonth([])).toBeNull();
  });

  it('handles ties deterministically (first match wins)', () => {
    const tied = [
      { ...usages[0], units: 100 },
      { ...usages[1], units: 100 },
    ];
    expect(highestMonth(tied)).toBe(tied[0]);
    expect(lowestMonth(tied)).toBe(tied[0]);
  });
});

describe('unitsSinceLastBill', () => {
  it('returns null when there are no BILL readings', () => {
    const casual = reading({
      readingValue: 1500,
      readingDate: '2025-02-20',
      readingType: 'CASUAL',
    });
    expect(unitsSinceLastBill([], casual)).toBeNull();
  });

  it('returns delta from the latest BILL', () => {
    const bills = [
      reading({ readingValue: 1000, readingDate: '2025-01-15' }),
      reading({ readingValue: 1200, readingDate: '2025-02-15' }),
    ];
    const casual = reading({
      readingValue: 1270,
      readingDate: '2025-02-20',
      readingType: 'CASUAL',
    });
    expect(unitsSinceLastBill(bills, casual)).toBe(70);
  });

  it('clamps negative deltas to 0 (casual lower than last bill)', () => {
    const bills = [
      reading({ readingValue: 1200, readingDate: '2025-02-15' }),
    ];
    const casual = reading({
      readingValue: 1100,
      readingDate: '2025-02-20',
      readingType: 'CASUAL',
    });
    expect(unitsSinceLastBill(bills, casual)).toBe(0);
  });
});
