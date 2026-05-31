import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed stable for `delayMs` milliseconds.
 *
 * Use this to keep tight UI feedback on the immediate input (e.g. a TextField
 * that reflects every keystroke) while deferring the **derived work**
 * (filter, query, etc.) until the user actually pauses.
 *
 * Example:
 *   const [query, setQuery] = useState('');
 *   const debounced = useDebouncedValue(query, 150);
 *   const filtered = useMemo(() => filter(items, debounced), [items, debounced]);
 */
export function useDebouncedValue<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
