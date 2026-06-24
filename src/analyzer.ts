import { Finding, QueryRecord } from './types';

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
  // TODO: Group queries by (fingerprint + callSite), count occurrences,
  // and return findings for groups with count >= threshold.
  // See AGENTS.md for details.
  void records;
  void threshold;
  return [];
}
