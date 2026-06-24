import { MongoosleuthOptions } from './types';

/**
 * Patches mongoose.Query.prototype.exec once to intercept executed queries.
 * Fingerprints and records each query into the active RequestScope.
 *
 * See AGENTS.md: QueryInterceptor.
 *
 * @param mongooseInstance The Mongoose instance to patch.
 * @param options Mongoosleuth options (e.g. threshold, captureStackTrace).
 */
export function attachInterceptor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mongooseInstance: any,
  options: MongoosleuthOptions
): void {
  // TODO: Patch mongoose.Query.prototype.exec to intercept queries.
  // Record queries into RequestScope if it's active.
  // Ensure stack traces are captured based on options.captureStackTrace.
  // See AGENTS.md for details.
  void mongooseInstance;
  void options;
}
