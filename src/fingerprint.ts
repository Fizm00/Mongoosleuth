/**
 * Checks if a value behaves like a MongoDB/Mongoose ObjectId.
 * Since this module is pure, it does not import from mongoose.
 */
function isObjectId(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyVal = val as any;
  if (anyVal._bsontype === 'ObjectID') return true;
  if (
    anyVal.constructor &&
    (anyVal.constructor.name === 'ObjectId' || anyVal.constructor.name === 'ObjectID')
  ) {
    return true;
  }
  if (typeof anyVal.toHexString === 'function') return true;
  return false;
}

/**
 * Recursively normalizes a query filter value into its shape representation.
 */
function normalizeValue(val: unknown): unknown {
  if (val === null) return '<null>';
  if (val === undefined) return '<undefined>';

  if (isObjectId(val)) {
    return '<ObjectId>';
  }
  if (val instanceof Date) {
    return '<Date>';
  }
  if (val instanceof RegExp) {
    return '<RegExp>';
  }
  if (typeof val === 'string') {
    return '<string>';
  }
  if (typeof val === 'number') {
    return '<number>';
  }
  if (typeof val === 'boolean') {
    return '<boolean>';
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return '<empty array>';
    }
    // Normalize using only the shape of the first element
    return [normalizeValue(val[0])];
  }
  if (typeof val === 'object') {
    // If it's a plain object (or behaves like one), recurse
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>)) {
      result[key] = normalizeValue((val as Record<string, unknown>)[key]);
    }
    return result;
  }
  return `<${typeof val}>`;
}

/**
 * Recursively sorts keys of an object alphabetically.
 */
function sortObjectKeys(val: unknown): unknown {
  if (val === null || val === undefined || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sortObjectKeys);
  }
  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(val as Record<string, unknown>).sort();
  for (const key of keys) {
    sortedObj[key] = sortObjectKeys((val as Record<string, unknown>)[key]);
  }
  return sortedObj;
}

/**
 * Normalizes a query filter object, replacing primitive leaf values with type tags (e.g., '<string>', '<ObjectId>').
 * Keeps object keys and nesting structure intact. For arrays, uses the shape of the first element.
 *
 * See AGENTS.md: fingerprinting rules.
 *
 * @param filter The raw Mongoose query filter object.
 * @returns The normalized filter shape.
 */
export function normalizeFilterShape(filter: Record<string, unknown>): Record<string, unknown> {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    return {};
  }
  return normalizeValue(filter) as Record<string, unknown>;
}

/**
 * Builds a query fingerprint string in the format "${modelName}:${operation}:${normalizedFilterShape}".
 *
 * @param modelName Name of the Mongoose model.
 * @param operation Name of the query operation (e.g., find, findOne).
 * @param filter The query filter object.
 * @returns A unique fingerprint string representing the query template.
 */
export function buildFingerprint(
  modelName: string,
  operation: string,
  filter: Record<string, unknown>
): string {
  const normalized = normalizeFilterShape(filter);
  const sorted = sortObjectKeys(normalized);
  return `${modelName}:${operation}:${JSON.stringify(sorted)}`;
}
