import { Finding, Reporter } from '../types';

/**
 * Pluggable reporter that outputs query N+1 findings as a JSON string.
 * See AGENTS.md: Reporter.
 */
export class JsonReporter implements Reporter {
  private outputFn: (json: string) => void;

  constructor(outputFn?: (json: string) => void) {
    // Default output function could write to process.stdout or keep it in memory
    this.outputFn = outputFn || ((json) => process.stdout.write(json + '\n'));
  }

  /**
   * Serializes the findings to JSON and writes/outputs them.
   * @param findings The list of findings to serialize and report.
   */
  public report(findings: Finding[]): void {
    // TODO: Serialize findings array and output it using outputFn.
    // See AGENTS.md for details.
    void findings;
  }
}
