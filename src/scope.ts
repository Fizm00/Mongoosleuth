import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Represents a recorded query within a tracking scope.
 */
export interface QueryRecord {
  model: string;
  operation: string;
  fingerprint: string;
  callSite: string;
  count: number;
}

// Thread-safe request/execution context isolation for queries
const storage = new AsyncLocalStorage<Map<string, QueryRecord>>();

/**
 * Opens a new query tracking scope for the duration of the asynchronous function `fn`.
 *
 * @param fn The asynchronous function to execute within the scope.
 * @returns The resolved/rejected promise value of `fn`.
 */
export function runInScope<T>(fn: () => Promise<T>): Promise<T> {
  const scopeMap = new Map<string, QueryRecord>();
  return storage.run(scopeMap, fn);
}

/**
 * Records an intercepted query into the active scope, if one is active.
 * If called outside of an active scope, it silently does nothing.
 *
 * @param entry The query details to record.
 */
export function recordQuery(entry: {
  model: string;
  operation: string;
  fingerprint: string;
  callSite: string;
}): void {
  const store = storage.getStore();
  if (!store) {
    return;
  }

  const key = `${entry.fingerprint}::${entry.callSite}`;
  const existing = store.get(key);

  if (existing) {
    existing.count++;
  } else {
    store.set(key, {
      model: entry.model,
      operation: entry.operation,
      fingerprint: entry.fingerprint,
      callSite: entry.callSite,
      count: 1,
    });
  }
}

/**
 * Returns all recorded queries inside the currently active scope as an array.
 * Returns `undefined` if called outside any active scope.
 *
 * @returns Array of QueryRecord objects or undefined.
 */
export function getActiveRecords(): QueryRecord[] | undefined {
  const store = storage.getStore();
  if (!store) {
    return undefined;
  }
  return Array.from(store.values());
}
