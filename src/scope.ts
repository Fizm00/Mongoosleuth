import { AsyncLocalStorage } from 'async_hooks';
import { QueryRecord } from './types';

/**
 * Manages request-scoped storage using AsyncLocalStorage.
 * Stores query execution records mapped by their fingerprint/key.
 */
export class RequestScope {
  private static storage = new AsyncLocalStorage<Map<string, QueryRecord[]>>();

  /**
   * Starts a new request scope and executes the provided function within it.
   */
  public static run<T>(store: Map<string, QueryRecord[]>, fn: () => T): T {
    // TODO: Wrap fn inside storage.run() as described in AGENTS.md
    void store;
    return fn();
  }

  /**
   * Gets the active query store for the current request context.
   */
  public static getStore(): Map<string, QueryRecord[]> | undefined {
    // TODO: Retrieve store from storage.getStore() as described in AGENTS.md
    return this.storage.getStore();
  }

  /**
   * Adds a query record to the active scope if it exists.
   */
  public static record(record: QueryRecord): void {
    // TODO: Add the record to the active Map as described in AGENTS.md
    void record;
  }
}
