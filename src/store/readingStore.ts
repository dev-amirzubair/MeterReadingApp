import { create } from 'zustand';
import type { Reading } from '../types/domain';
import {
  readingRepository,
  type NewReadingInput,
  type UpdateReadingInput,
} from '../database/readingRepository';

/**
 * Stable empty array used by `selectReadingsForMeter` to avoid generating a
 * fresh `[]` reference on every render when the meter has no cached readings
 * yet. A fresh `[]` would defeat shallow-equality memoisation downstream.
 */
const EMPTY_READINGS: readonly Reading[] = Object.freeze([]);

interface ReadingState {
  /** readings per meterId */
  byMeter: Record<string, Reading[]>;
  loadingMeterId: string | null;
  error: string | null;

  refreshForMeter: (meterId: string) => Promise<void>;
  add: (input: NewReadingInput) => Promise<Reading>;
  update: (id: string, meterId: string, input: UpdateReadingInput) => Promise<void>;
  remove: (id: string, meterId: string) => Promise<void>;
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  byMeter: {},
  loadingMeterId: null,
  error: null,

  refreshForMeter: async meterId => {
    set({ loadingMeterId: meterId, error: null });
    try {
      const list = await readingRepository.listForMeter(meterId);
      set(state => ({
        byMeter: { ...state.byMeter, [meterId]: list },
        loadingMeterId: null,
      }));
    } catch (e) {
      set({ loadingMeterId: null, error: (e as Error).message });
    }
  },

  add: async input => {
    const reading = await readingRepository.create(input);
    const list = get().byMeter[input.meterId] ?? [];
    set(state => ({
      byMeter: {
        ...state.byMeter,
        [input.meterId]: [reading, ...list],
      },
    }));
    return reading;
  },

  update: async (id, meterId, input) => {
    await readingRepository.update(id, input);
    await get().refreshForMeter(meterId);
  },

  remove: async (id, meterId) => {
    await readingRepository.remove(id);
    set(state => ({
      byMeter: {
        ...state.byMeter,
        [meterId]: (state.byMeter[meterId] ?? []).filter(r => r.id !== id),
      },
    }));
  },
}));

/**
 * Stable selector for readings of a meter. Returns the cached array if there
 * is one, otherwise the singleton `EMPTY_READINGS` reference. Use this in
 * components that want shallow-equality wins (e.g. memoised list rows).
 */
export const selectReadingsForMeter =
  (meterId: string) =>
  (state: ReadingState): readonly Reading[] =>
    state.byMeter[meterId] ?? EMPTY_READINGS;
