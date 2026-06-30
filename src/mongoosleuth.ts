/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoosleuthOptions } from './types';
import { ConsoleReporter } from './reporters/console';
import { runInScope, getRawStore } from './scope';
import { attachInterceptor } from './interceptor';
import { analyzeRecords } from './analyzer';

/**
 * The main Mongoosleuth library class.
 * Coordinates intercepting queries, request-scoped tracking, and analyzing/reporting.
 *
 * See AGENTS.md: Public API surface.
 */
export class Mongoosleuth {
  public readonly options: Required<MongoosleuthOptions>;

  /**
   * Initializes a new instance of Mongoosleuth.
   * @param options Configuration options.
   */
  constructor(options?: MongoosleuthOptions) {
    const enabled =
      options?.enabled !== undefined ? options.enabled : process.env.NODE_ENV !== 'production';
    const threshold = options?.threshold !== undefined ? options.threshold : 3;
    const captureStackTrace =
      options?.captureStackTrace !== undefined ? options.captureStackTrace : true;
    const ignore = options?.ignore || [];
    const reporters = options?.reporters || [new ConsoleReporter()];

    if (options?.threshold !== undefined && options.threshold < 1) {
      throw new Error(
        `[mongoosleuth] Invalid threshold value: ${options.threshold}. Threshold must be >= 1.`
      );
    }

    this.options = {
      enabled,
      threshold,
      captureStackTrace,
      ignore,
      reporters,
    };
  }

  /**
   * Patches the given Mongoose instance to intercept all query executions.
   *
   * @param mongooseInstance Mongoose library instance to attach to.
   */
  public attach(mongooseInstance: any): void {
    attachInterceptor(mongooseInstance, this.options);
  }

  /**
   * Internal helper to run query pattern analysis and trigger reporters.
   */
  private analyzeAndReport(records: any[] | undefined): void {
    const findings = analyzeRecords(records, {
      threshold: this.options.threshold,
    });
    if (findings.length > 0) {
      for (const reporter of this.options.reporters) {
        reporter.report(findings);
      }
    }
  }

  /**
   * Express/Koa/Fastify middleware that opens a RequestScope for each incoming request
   * and runs pattern analysis upon request completion.
   *
   * @returns Request middleware function.
   */
  public middleware(): (req: any, res: any, next: (err?: any) => void) => void {
    return (req: any, res: any, next: (err?: any) => void) => {
      if (!this.options.enabled) {
        next();
        return;
      }

      runInScope(async () => {
        const store = getRawStore();
        res.on('finish', () => {
          const records = store ? Array.from(store.values()) : [];
          this.analyzeAndReport(records);
        });
        next();
      });
    };
  }

  /**
   * Manually runs a function within a new query tracking scope.
   * Useful for background jobs, scripts, or manual request cycles outside standard middleware.
   *
   * @param fn The asynchronous function to execute within the scope.
   */
  public async run<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.options.enabled) {
      return fn();
    }

    let records: any[] | undefined;
    try {
      return await runInScope(async () => {
        const store = getRawStore();
        try {
          return await fn();
        } finally {
          records = store ? Array.from(store.values()) : [];
        }
      });
    } finally {
      this.analyzeAndReport(records);
    }
  }
}
