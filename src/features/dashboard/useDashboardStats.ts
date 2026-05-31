import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { meterRepository } from '../../database/meterRepository';
import { readingRepository } from '../../database/readingRepository';
import {
  averageMonthlyUnits,
  currentMonthUsage,
  highestMonth,
  lowestMonth,
  monthlyUsageFromBillReadings,
  previousMonthUsage,
} from '../../utils/usage';
import type { MeterStats } from '../../types/domain';

const EMPTY: MeterStats = {
  totalMeters: 0,
  currentMonthUnits: null,
  previousMonthUnits: null,
  averageMonthlyUnits: null,
  highestMonth: null,
  lowestMonth: null,
  lastReading: null,
};

/**
 * Aggregates dashboard stats across **all** meters.
 *
 * Note: monthly usage is computed per-meter and then summed by YYYY-MM, so a
 * household with multiple meters sees the combined figure for the period.
 */
export function useDashboardStats() {
  const [stats, setStats] = useState<MeterStats>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const [meterCount, allBills, lastReading] = await Promise.all([
        meterRepository.count(),
        readingRepository.listAllBillReadings(),
        readingRepository.findGlobalLatest(),
      ]);

      // Group BILL readings by meter, compute per-meter monthly usage, then
      // sum units by month across all meters.
      const billsByMeter = new Map<string, typeof allBills>();
      for (const r of allBills) {
        const list = billsByMeter.get(r.meterId) ?? [];
        list.push(r);
        billsByMeter.set(r.meterId, list);
      }

      const monthTotals = new Map<
        string,
        { units: number; startDate: string; endDate: string; startReading: number; endReading: number }
      >();
      for (const bills of billsByMeter.values()) {
        const usages = monthlyUsageFromBillReadings(bills);
        for (const u of usages) {
          const existing = monthTotals.get(u.month);
          if (existing) {
            existing.units += u.units;
            // keep the latest endDate / earliest startDate is debatable; we
            // just carry the first meter's bracket for display.
          } else {
            monthTotals.set(u.month, {
              units: u.units,
              startDate: u.startDate,
              endDate: u.endDate,
              startReading: u.startReading,
              endReading: u.endReading,
            });
          }
        }
      }

      const aggregatedUsages = Array.from(monthTotals.entries()).map(
        ([month, v]) => ({ month, ...v }),
      );

      setStats({
        totalMeters: meterCount,
        currentMonthUnits: currentMonthUsage(aggregatedUsages)?.units ?? null,
        previousMonthUnits: previousMonthUsage(aggregatedUsages)?.units ?? null,
        averageMonthlyUnits: averageMonthlyUnits(aggregatedUsages),
        highestMonth: highestMonth(aggregatedUsages),
        lowestMonth: lowestMonth(aggregatedUsages),
        lastReading,
      });
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    compute();
  }, [compute]);

  useFocusEffect(
    useCallback(() => {
      compute();
    }, [compute]),
  );

  return { stats, loading, hasLoadedOnce, refresh: compute };
}
