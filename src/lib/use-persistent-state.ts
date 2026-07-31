'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Persisted state backed by localStorage.
 *
 * Implemented with `useSyncExternalStore` (the React-recommended way to read
 * external mutable state) so that:
 *  - The server + first client render use `getServerSnapshot` (no hydration
 *    mismatches), then React re-renders with the stored value after hydration.
 *  - State updates are written straight to localStorage and broadcast through a
 *    custom event, so the current tab and other open tabs stay in sync.
 *  - No `setState` calls inside effects (satisfies react-hooks lint rules).
 */

const STORE_EVENT = 'mun-storage-change';

/** Module-level cache so `getSnapshot` returns a stable reference per key. */
const cache = new Map<string, unknown>();

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readValue<T>(key: string, fallback: T): T {
  if (!cache.has(key)) {
    cache.set(key, readLocalStorage(key, fallback));
  }
  return cache.get(key) as T;
}

function subscribe(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key) {
      try {
        cache.set(e.key, e.newValue !== null ? JSON.parse(e.newValue) : undefined);
      } catch {
        cache.delete(e.key);
      }
    }
    callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(STORE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(STORE_EVENT, callback);
  };
}

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export function usePersistentState<T>(key: string, fallback: T): [T, Setter<T>] {
  const getSnapshot = useCallback(() => readValue(key, fallback), [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) as T;

  const setValue = useCallback<Setter<T>>(
    (next) => {
      const prev = readValue(key, fallback);
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      cache.set(key, resolved);
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage unavailable (private mode / quota) — keep in-memory value.
      }
      window.dispatchEvent(new CustomEvent(STORE_EVENT));
    },
    [key, fallback]
  );

  return [value, setValue];
}
