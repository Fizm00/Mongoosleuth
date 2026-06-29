import { Finding, Reporter } from '../types';
import { formatQueryLine, suggestFix } from './format-finding';

/**
 * Default reporter that prints query N+1 findings to console.warn.
 * See AGENTS.md: Reporter.
 */
export class ConsoleReporter implements Reporter {
  /**
   * Reports the identified N+1 query findings.
   * @param findings The list of findings to report.
   */
  public report(findings: Finding[]): void {
    if (findings.length === 0) {
      return;
    }

    for (const finding of findings) {
      console.warn(`[mongoosleuth] N+1 detected
  model: ${finding.model}
  query: ${formatQueryLine(finding)}
  called ${finding.count} times in ${finding.callSite}
  fix: ${suggestFix(finding)}`);
    }
  }
}
