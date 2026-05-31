import { create } from 'zustand';
import type { Meter } from '../types/domain';
import {
  meterRepository,
  type NewMeterInput,
  type UpdateMeterInput,
} from '../database/meterRepository';

interface MeterState {
  meters: Meter[];
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  search: (query: string) => Promise<Meter[]>;
  add: (input: NewMeterInput) => Promise<Meter>;
  update: (id: string, input: UpdateMeterInput) => Promise<Meter | null>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Meter | undefined;
}

export const useMeterStore = create<MeterState>((set, get) => ({
  meters: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const meters = await meterRepository.listAll();
      set({ meters, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  search: async (query: string) => {
    if (!query.trim()) {
      return get().meters;
    }
    return meterRepository.search(query);
  },

  add: async input => {
    const meter = await meterRepository.create(input);
    set(state => ({ meters: [meter, ...state.meters] }));
    return meter;
  },

  update: async (id, input) => {
    const updated = await meterRepository.update(id, input);
    if (updated) {
      set(state => ({
        meters: state.meters.map(m => (m.id === id ? updated : m)),
      }));
    }
    return updated;
  },

  remove: async id => {
    await meterRepository.remove(id);
    set(state => ({ meters: state.meters.filter(m => m.id !== id) }));
  },

  getById: id => get().meters.find(m => m.id === id),
}));
