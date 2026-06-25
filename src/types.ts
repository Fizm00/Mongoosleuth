/**
 * Options for configuring Mongoosleuth.
 */
export interface MongoosleuthOptions {
  /**
   * Whether Mongoosleuth is enabled.
   * @default process.env.NODE_ENV !== 'production'
   */
  enabled?: boolean;

  /**
   * The count threshold for identical queries at a single call-site to flag a finding.
   * @default 3
   */
  threshold?: number;

  /**
   * Whether to capture the stack trace for precise location mapping.
   * @default true
   */
  captureStackTrace?: boolean;

  /**
   * Configurations to ignore specific models or operations.
   */
  ignore?: Array<{
    model?: string;
    operation?: string;
  }>;

  /**
   * Reporters to write results to.
   * @default [new ConsoleReporter()]
   */
  reporters?: Reporter[];
}

/**
 * Represents a single N+1 query pattern finding.
 */
export interface Finding {
  /**
   * The name of the Mongoose model being queried.
   */
  model: string;

  /**
   * The Mongoose query operation (e.g., 'find', 'findOne').
   */
  operation: string;

  /**
   * The fingerprint representing the query shape, normalized filter, and operation.
   */
  fingerprint: string;

  /**
   * The number of times this exact pattern was executed.
   */
  count: number;

  /**
   * The call site (file, line number, column) where the query originated.
   */
  callSite: string;
}

/**
 * Pluggable interface for reporting N+1 query findings.
 */
export interface Reporter {
  /**
   * Reports the findings to the target output.
   * @param findings The list of findings to report.
   */
  report(findings: Finding[]): void;
}

export { QueryRecord } from './scope';
