import { Finding, Reporter } from '../types';

/**
 * Default reporter that logs query N+1 findings to the console.
 * See AGENTS.md: Reporter.
 */
export class ConsoleReporter implements Reporter {
  /**
   * Outputs the list of query N+1 findings in a human-readable format.
   * @param findings The list of findings to log.
   */
  public report(findings: Finding[]): void {
    // TODO: Print findings clearly to the console.
    // This is the only file permitted to use console.log/console.warn/etc.
    // See AGENTS.md for details.
    void findings;
  }
}
