import { createMMKV } from 'react-native-mmkv';

/**
 * Default MMKV storage instance for app preferences.
 * Use a separate id (and optional encryptionKey) per logical bucket
 * if you need to isolate data by domain (e.g. session vs cache).
 */
export const storage = createMMKV({
  id: 'meter-reading-default',
});

export const secureStorage = createMMKV({
  id: 'meter-reading-secure',
  // encryptionKey: 'replace-with-a-secure-random-key',
});

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export const Storage = {
  setString(key: string, value: string) {
    storage.set(key, value);
  },
  getString(key: string): string | undefined {
    return storage.getString(key);
  },

  setNumber(key: string, value: number) {
    storage.set(key, value);
  },
  getNumber(key: string): number | undefined {
    return storage.getNumber(key);
  },

  setBoolean(key: string, value: boolean) {
    storage.set(key, value);
  },
  getBoolean(key: string): boolean | undefined {
    return storage.getBoolean(key);
  },

  setObject<T extends JsonValue>(key: string, value: T) {
    storage.set(key, JSON.stringify(value));
  },
  getObject<T extends JsonValue>(key: string): T | undefined {
    const raw = storage.getString(key);
    if (!raw) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },

  contains(key: string): boolean {
    return storage.contains(key);
  },
  remove(key: string) {
    storage.remove(key);
  },
  clearAll() {
    storage.clearAll();
  },
  getAllKeys(): string[] {
    return storage.getAllKeys();
  },
};

export const StorageKeys = {
  USERNAME: 'user.name',
  THEME: 'app.theme',
  LAST_URL: 'webview.lastUrl',
  COUNTER: 'home.counter',
  TODO_LIST: 'home.todos',
} as const;
