import type { StateStorage } from 'zustand/middleware';
import { storage } from '../storage/mmkv';

/**
 * Zustand `persist` storage adapter backed by MMKV.
 * MMKV is synchronous so all methods can resolve immediately.
 */
export const zustandMmkvStorage: StateStorage = {
  getItem: name => storage.getString(name) ?? null,
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: name => {
    storage.remove(name);
  },
};
