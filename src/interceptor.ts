/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoosleuthOptions } from './types';
import { buildFingerprint } from './fingerprint';
import { recordQuery } from './scope';

// Global reference to the original Mongoose Query.prototype.exec function
let originalExec: any = null;

/**
 * Extracts and formats the relative callsite from a stack trace string.
 * Filters out internal library frames from mongoose and mongoosleuth.
 *
 * @param stack Raw stack trace string from Error().stack.
 * @returns Formatted "file:line" string or "unknown".
 */
export function buildCallSite(stack: string): string {
  const lines = stack.split('\n');

  // Regular expression to identify internal library frames that should be skipped
  const isInternal =
    /node_modules[\\/]mongoose[\\/]|node_modules[\\/]mongoosleuth[\\/]|[\\/]mongoosleuth[\\/]src[\\/]|[\\/]mongoosleuth[\\/]dist[\\/]|[\\/]src[\\/](?:interceptor|scope|mongoosleuth|fingerprint|analyzer)\.ts/i;

  for (const line of lines) {
    if (!line.includes('at ')) {
      continue;
    }

    if (isInternal.test(line)) {
      continue;
    }

    // Extract path between parentheses or directly after 'at '
    const parenMatch = line.match(/\(([^)]+)\)/);
    const pathStr = parenMatch ? parenMatch[1] : line.trim().slice(3); // strip "at "

    // Normalize backslashes to forward slashes for cross-platform consistency
    let normalizedPath = pathStr.replace(/\\/g, '/');
    const cwd = process.cwd().replace(/\\/g, '/');

    // Make path relative to the current working directory
    if (normalizedPath.toLowerCase().startsWith(cwd.toLowerCase() + '/')) {
      normalizedPath = normalizedPath.slice(cwd.length + 1);
    }

    // Capture file path and line number, discarding column info
    const cleanMatch = normalizedPath.match(/^(.*?):(\d+)(:\d+)?$/);
    if (cleanMatch) {
      return `${cleanMatch[1]}:${cleanMatch[2]}`;
    }
  }

  return 'unknown';
}

/**
 * Patches mongoose.Query.prototype.exec once to intercept executed queries.
 * Fingerprints and records each query into the active RequestScope.
 *
 * See AGENTS.md: QueryInterceptor.
 *
 * @param mongooseInstance The Mongoose instance to patch.
 * @param options Mongoosleuth options (e.g. threshold, captureStackTrace).
 */
export function attachInterceptor(mongooseInstance: any, options: MongoosleuthOptions): void {
  if (!mongooseInstance || !mongooseInstance.Query || !mongooseInstance.Query.prototype) {
    return;
  }

  // Ensure idempotency
  if (
    mongooseInstance.Query.prototype.exec &&
    mongooseInstance.Query.prototype.exec.__mongoosleuthPatched
  ) {
    console.warn('[mongoosleuth] already attached, skipping');
    return;
  }

  // Store reference to the original function for restoration
  originalExec = mongooseInstance.Query.prototype.exec;

  // Capture options by value (closure)
  const enabled = options.enabled !== false;
  const captureStackTrace = options.captureStackTrace !== false;
  const ignore = options.ignore || [];

  const patchedExec = function (this: any, ...args: any[]) {
    if (!enabled) {
      return originalExec.apply(this, args);
    }

    const modelName = this.model?.modelName;
    const operation = this.op;

    if (!modelName || !operation) {
      return originalExec.apply(this, args);
    }

    // Check if the current model and operation should be ignored
    const isIgnored = ignore.some((entry) => {
      const matchModel = !entry.model || entry.model === modelName;
      const matchOp = !entry.operation || entry.operation === operation;
      return matchModel && matchOp;
    });

    if (isIgnored) {
      return originalExec.apply(this, args);
    }

    const filter = this.getQuery() || {};
    const fingerprint = buildFingerprint(modelName, operation, filter);

    let callSite = 'unknown';
    if (captureStackTrace) {
      const stack = new Error().stack;
      if (stack) {
        callSite = buildCallSite(stack);
      }
    }

    recordQuery({
      model: modelName,
      operation,
      fingerprint,
      callSite,
    });

    return originalExec.apply(this, args);
  };

  // Add the marker flag to ensure idempotency
  (patchedExec as any).__mongoosleuthPatched = true;

  // Overwrite prototype exec
  mongooseInstance.Query.prototype.exec = patchedExec;
}

/**
 * Resets the patched Mongoose Query.prototype.exec back to its original state.
 * Internal-only utility for test cleanups.
 *
 * @param mongooseInstance Mongoose instance to reset.
 */
export function __resetForTests(mongooseInstance: any): void {
  if (
    mongooseInstance &&
    mongooseInstance.Query &&
    mongooseInstance.Query.prototype &&
    originalExec
  ) {
    mongooseInstance.Query.prototype.exec = originalExec;
    originalExec = null;
  }
}
