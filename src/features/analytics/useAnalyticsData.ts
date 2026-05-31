import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { readingRepository } from '../../database/readingRepository';
import type { Reading } from '../../types/domain';

/**
 * Loads all BILL readings across all meters, refreshing on focus.
 * Analytics computations happen in the screen using the resulting list.
 */
export function useAnalyticsData() {
  const [bills, setBills] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await readingRepository.listAllBillReadings();
      setBills(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { bills, loading, refresh };
}
