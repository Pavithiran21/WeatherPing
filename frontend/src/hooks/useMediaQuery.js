import { useSyncExternalStore } from 'react';

/** True while the CSS media query matches, for example useMediaQuery('(width < 62.5rem)'). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Phone layout: below the 1000 px "tab" breakpoint in index.css. */
export const PHONE_QUERY = '(width < 62.5rem)';
