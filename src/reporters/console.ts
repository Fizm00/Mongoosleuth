/* eslint-disable @typescript-eslint/no-explicit-any */
import { Finding, Reporter } from '../types';

/**
 * Recursively converts a parsed JSON object into a javascript object literal string.
 * Renders keys and type tags (e.g. <ObjectId>) without quotes.
 */
function renderValue(val: unknown): string {
  if (val === null) {
    return '<null>';
  }
  if (val === undefined) {
    return '<undefined>';
  }

  if (typeof val === 'string') {
    // If the value is a type tag (e.g., "<ObjectId>"), render it without quotes
    if (val.startsWith('<') && val.endsWith('>')) {
      return val;
    }
    return `"${val}"`;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return '[]';
    }
    return `[${renderValue(val[0])}]`;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>);
    if (keys.length === 0) {
      return '{}';
    }
    const entries = keys.map((key) => {
      const innerVal = (val as Record<string, unknown>)[key];
      return `${key}: ${renderValue(innerVal)}`;
    });
    return `{ ${entries.join(', ')} }`;
  }

  return String(val);
}

/**
 * Pure function that formats a Finding into a human-readable string.
 *
 * @param finding The N+1 query finding to format.
 * @param options Styling options (e.g. enable color).
 * @returns Formatted warning block as a string.
 */
export function formatFinding(finding: Finding, options: { color: boolean }): string {
  const fingerprint = finding.fingerprint;
  const firstColon = fingerprint.indexOf(':');
  const secondColon = fingerprint.indexOf(':', firstColon + 1);
  let jsonShape = '';

  if (firstColon !== -1 && secondColon !== -1) {
    jsonShape = fingerprint.substring(secondColon + 1);
  } else {
    jsonShape = fingerprint;
  }

  let renderedShape = jsonShape;
  try {
    const parsed = JSON.parse(jsonShape);
    renderedShape = renderValue(parsed);
  } catch (err) {
    // Fallback to raw jsonShape if parsing fails (defensive programming)
  }

  const header = options.color
    ? '\x1b[33m[mongoosleuth] N+1 detected\x1b[0m'
    : '[mongoosleuth] N+1 detected';

  return `${header}
  model: ${finding.model}
  query: ${finding.operation}(${renderedShape})
  called ${finding.count} times in ${finding.callSite}
  fix: looks like a loop — consider .populate() if this is a relation
  on the parent document, or batch with { _id: { $in: [...] } } if
  you're fetching documents one by one.`;
}

/**
 * Default reporter that logs query N+1 findings to process.stdout or a custom stream.
 * See AGENTS.md: Reporter.
 */
export class ConsoleReporter implements Reporter {
  private stream: NodeJS.WritableStream;
  private color: boolean;

  /**
   * Initializes a new instance of ConsoleReporter.
   * @param options Styling and stream routing options.
   */
  constructor(options?: { color?: boolean; stream?: NodeJS.WritableStream }) {
    this.stream = options?.stream || process.stdout;
    if (options?.color !== undefined) {
      this.color = options.color;
    } else {
      // Auto-detect based on TTY (avoid ANSI codes when logging to files/aggregators)
      this.color = !!(this.stream as any).isTTY;
    }
  }

  /**
   * Outputs the list of query N+1 findings to the writable stream.
   * @param findings The list of findings to log.
   */
  public report(findings: Finding[]): void {
    if (findings.length === 0) {
      return;
    }

    const formatted = findings.map((finding) => formatFinding(finding, { color: this.color }));

    // Join with double newline, write with single trailing newline
    this.stream.write(formatted.join('\n\n') + '\n');
  }
}
