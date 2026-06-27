import type { QueryRecord } from './scope';
import type { Finding } from './types';

/**
 * Analyzes recorded queries and groups them by fingerprint and call site.
 * Emits a Finding for each group where the execution count meets or exceeds the threshold.
 *
 * This function must remain pure (no I/O, no Mongoose imports).
 * See AGENTS.md: PatternAnalyzer.
 *
 * @param records Flat list of recorded queries executed during the request.
 * @param threshold The occurrence threshold to trigger a Finding.
 * @returns Array of identified N+1 query findings.
 */
export function analyze(records: QueryRecord[], threshold: number): Finding[] {
  if (!records || records.length === 0) {
    return [];
  }

  // Filter out queries below threshold, map to public Finding contract
  const findings: Finding[] = records
    .filter((r) => r.count >= threshold)
    .map((r) => ({
      model: r.model,
      operation: r.operation,
      fingerprint: r.fingerprint,
      count: r.count,
      callSite: r.callSite,
    }));

  // Deterministically sort findings:
  // 1. Descending by query count (highest count first).
  // 2. Alphabetically ascending by model name (tie-break).
  // 3. Alphabetically ascending by query fingerprint (secondary tie-break).
  findings.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    const modelCompare = a.model.localeCompare(b.model);
    if (modelCompare !== 0) {
      return modelCompare;
    }

    return a.fingerprint.localeCompare(b.fingerprint);
  });

  return findings;
}
