/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Finding } from '../types';

/**
 * Helper to recursively format a parsed shape value into a JS-like object literal notation.
 * Strips quotes from keys and type tag values (e.g. <ObjectId>).
 */
function renderVal(val: any): string {
  if (val === null) {
    return '<null>';
  }
  if (val === undefined) {
    return '<undefined>';
  }

  if (typeof val === 'string') {
    if (val.startsWith('<') && val.endsWith('>')) {
      return val;
    }
    return `"${val}"`;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return '[]';
    }
    return `[${renderVal(val[0])}]`;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) {
      return '{}';
    }
    const entries = keys.map((key) => `${key}: ${renderVal(val[key])}`);
    return `{ ${entries.join(', ')} }`;
  }

  return String(val);
}

/**
 * Extracts and parses the JSON shape from a fingerprint.
 *
 * @param finding The N+1 query finding.
 * @returns Parsed shape object or {} if parsing fails.
 */
export function extractQueryShape(finding: Finding): Record<string, any> {
  const prefix = `${finding.model}:${finding.operation}:`;
  if (!finding.fingerprint || !finding.fingerprint.startsWith(prefix)) {
    return {};
  }
  const jsonShapeStr = finding.fingerprint.slice(prefix.length);
  try {
    return JSON.parse(jsonShapeStr);
  } catch {
    return {};
  }
}

/**
 * Formats the query line in the format: operation({ key1: value1, key2: value2 }).
 *
 * @param finding The N+1 query finding.
 * @returns Formatted query execution line.
 */
export function formatQueryLine(finding: Finding): string {
  const shape = extractQueryShape(finding);
  const keys = Object.keys(shape);
  if (keys.length === 0) {
    return `${finding.operation}({})`;
  }
  return `${finding.operation}(${renderVal(shape)})`;
}

/**
 * Suggests an N+1 query fix based on the operation.
 *
 * @param finding The N+1 query finding.
 * @returns Suggestion text.
 */
export function suggestFix(finding: Finding): string {
  const op = finding.operation;
  if (op === 'find' || op === 'findOne' || op === 'findById') {
    return 'use .populate() or batch this with a single query using $in';
  }
  return 'consider batching this operation instead of calling it in a loop (e.g. bulkWrite)';
}
