import { Finding, Reporter } from '../types';

/**
 * Pluggable reporter that outputs query N+1 findings as a single-line JSON string (NDJSON format).
 * See AGENTS.md: Reporter.
 */
export class JsonReporter implements Reporter {
  private write: (line: string) => void;

  /**
   * Initializes a new instance of JsonReporter.
   * @param write Optional callback function to write the JSON line. Defaults to console.log.
   */
  constructor(write?: (line: string) => void) {
    this.write = write || console.log;
  }

  /**
   * Serializes the findings to JSON lines and writes them using the write handler.
   * @param findings The list of findings to serialize and report.
   */
  public report(findings: Finding[]): void {
    if (findings.length === 0) {
      return;
    }

    for (const finding of findings) {
      const output = {
        type: 'mongoosleuth_finding',
        timestamp: new Date().toISOString(),
        ...finding,
      };
      this.write(JSON.stringify(output));
    }
  }
}
