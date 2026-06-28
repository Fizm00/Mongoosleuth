import type { QueryRecord } from './scope';
import type { Finding } from './types';

/**
 * Analyzes recorded queries and maps them to public N+1 query findings.
 * Filters out query records whose count is below the specified threshold.
 *
 * This function is pure and side-effect free.
 * See AGENTS.md: PatternAnalyzer.
 *
 * @param records List of recorded queries from the active scope, or undefined if outside scope.
 * @param options Analyzer options (containing threshold).
 * @returns Array of N+1 query findings.
 */
export function analyzeRecords(
  records: QueryRecord[] | undefined,
  options: { threshold: number }
): Finding[] {
  if (!records) {
    return [];
  }

  // Filter records with count >= threshold and map to Finding structure
  const findings: Finding[] = records
    .filter((r) => r.count >= options.threshold)
    .map((r) => ({
      model: r.model,
      operation: r.operation,
      fingerprint: r.fingerprint,
      count: r.count,
      callSite: r.callSite,
    }));

  // Sort descending by count only (stable sort by default)
  findings.sort((a, b) => b.count - a.count);

  return findings;
}
