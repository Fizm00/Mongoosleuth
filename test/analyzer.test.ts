import { describe, it, expect } from 'vitest';
import { analyze } from '../src/analyzer';
import type { QueryRecord } from '../src/scope';

describe('Pattern Analyzer Thresholds & Sorting', () => {
  it('should return an empty array when given an empty records list', () => {
    const result = analyze([], 3);
    expect(result).toEqual([]);
  });

  it('should include a record when count is exactly equal to the threshold', () => {
    const records: QueryRecord[] = [
      {
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:10',
        count: 3,
      },
    ];

    const result = analyze(records, 3);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('User');
    expect(result[0].count).toBe(3);
  });

  it('should exclude a record when count is exactly one below the threshold', () => {
    const records: QueryRecord[] = [
      {
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:10',
        count: 2,
      },
    ];

    const result = analyze(records, 3);
    expect(result).toHaveLength(0);
  });

  it('should sort multiple findings in descending order of count', () => {
    const records: QueryRecord[] = [
      {
        model: 'Product',
        operation: 'find',
        fingerprint: 'Product:find:{}',
        callSite: 'product.js:20',
        count: 4,
      },
      {
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:10',
        count: 10,
      },
      {
        model: 'Comment',
        operation: 'findOne',
        fingerprint: 'Comment:findOne:{"id":"<string>"}',
        callSite: 'comment.js:5',
        count: 7,
      },
    ];

    const result = analyze(records, 3);
    expect(result).toHaveLength(3);
    expect(result[0].model).toBe('User'); // count 10
    expect(result[1].model).toBe('Comment'); // count 7
    expect(result[2].model).toBe('Product'); // count 4
  });

  it('should resolve identical count ties alphabetically by model, then fingerprint', () => {
    const records: QueryRecord[] = [
      {
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{"z":1}',
        callSite: 'user.js:10',
        count: 5,
      },
      {
        model: 'Product',
        operation: 'find',
        fingerprint: 'Product:find:{}',
        callSite: 'product.js:20',
        count: 5,
      },
      {
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{"a":1}',
        callSite: 'user.js:5',
        count: 5,
      },
    ];

    const result = analyze(records, 3);
    expect(result).toHaveLength(3);
    // Sort logic: 'Product' before 'User'
    // For 'User' tie, 'User:find:{"a":1}' before 'User:find:{"z":1}'
    expect(result[0].model).toBe('Product');
    expect(result[1].fingerprint).toBe('User:find:{"a":1}');
    expect(result[2].fingerprint).toBe('User:find:{"z":1}');
  });

  it('should not mutate the original records array when analyze is invoked', () => {
    const records: QueryRecord[] = [
      {
        model: 'Product',
        operation: 'find',
        fingerprint: 'Product:find:{}',
        callSite: 'product.js:20',
        count: 4,
      },
      {
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:10',
        count: 10,
      },
    ];

    const recordsCopy = JSON.parse(JSON.stringify(records));

    analyze(records, 3);
    analyze(records, 3);

    expect(records).toEqual(recordsCopy);
  });

  it('should filter out and completely omit records below threshold in mixed lists', () => {
    const records: QueryRecord[] = [
      {
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{}',
        callSite: 'user.js:10',
        count: 1,
      },
      {
        model: 'Product',
        operation: 'find',
        fingerprint: 'Product:find:{}',
        callSite: 'product.js:20',
        count: 5,
      },
      {
        model: 'Category',
        operation: 'findOne',
        fingerprint: 'Category:findOne:{}',
        callSite: 'category.js:5',
        count: 2,
      },
    ];

    const result = analyze(records, 3);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('Product');
  });
});
