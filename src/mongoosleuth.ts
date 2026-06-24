import { MongoosleuthOptions } from './types';

/**
 * The main Mongoosleuth library class.
 * Coordinates intercepting queries, request-scoped tracking, and analyzing/reporting.
 *
 * See AGENTS.md: Public API surface.
 */
export class Mongoosleuth {
  private options: MongoosleuthOptions;

  /**
   * Initializes a new instance of Mongoosleuth.
   * @param options Configuration options.
   */
  constructor(options?: MongoosleuthOptions) {
    this.options = {
      enabled: process.env.NODE_ENV !== 'production',
      threshold: 3,
      captureStackTrace: true,
      ignore: [],
      reporters: [],
      ...options,
    };
    // TODO: Set up defaults and initial state.
    void this.options;
  }

  /**
   * Patches the given Mongoose instance to intercept all query executions.
   *
   * @param mongooseInstance Mongoose library instance to attach to.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public attach(mongooseInstance: any): void {
    // TODO: Invoke the query interceptor patching.
    // See AGENTS.md: QueryInterceptor & Public API surface.
    void mongooseInstance;
  }

  /**
   * Express/Koa/Fastify middleware that opens a RequestScope for each incoming request
   * and runs pattern analysis upon request completion.
   *
   * @returns Request middleware function.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public middleware(): (req: any, res: any, next: any) => void {
    // TODO: Implement request middleware returning a function that scopes
    // the request, monitors res.on('finish'), runs the PatternAnalyzer,
    // and reports findings to the configured reporters.
    // See AGENTS.md for details.
    return (req, res, next) => {
      void req;
      void res;
      next();
    };
  }

  /**
   * Manually runs a function within a new query tracking scope.
   * Useful for background jobs, scripts, or manual request cycles outside standard middleware.
   *
   * @param fn The asynchronous function to execute within the scope.
   */
  public run<T>(fn: () => Promise<T>): Promise<T> {
    // TODO: Open a scope and run the function, executing analysis upon resolution.
    // See AGENTS.md for details.
    return fn();
  }
}
