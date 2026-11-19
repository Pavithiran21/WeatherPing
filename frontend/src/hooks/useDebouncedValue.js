import { useEffect, useState } from 'react';

/** The value once it has stopped changing for delayMs (so a search runs after typing pauses, not on every key). */
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
