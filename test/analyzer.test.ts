import { describe, it, expect } from 'vitest';
import { analyzeRecords } from '../src/analyzer';
import type { QueryRecord } from '../src/scope';

describe('Pattern Analyzer - analyzeRecords', () => {
  it('should return an empty array when records is undefined', () => {
    const result = analyzeRecords(undefined, { threshold: 3 });
    expect(result).toEqual([]);
  });

  it('should return an empty array when records is an empty array', () => {
    const result = analyzeRecords([], { threshold: 3 });
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

    const result = analyzeRecords(records, { threshold: 3 });
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

    const result = analyzeRecords(records, { threshold: 3 });
    expect(result).toHaveLength(0);
  });

  it('should filter out under-threshold records and sort the remaining in descending order of count', () => {
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
        count: 2, // will be excluded
      },
      {
        model: 'Author',
        operation: 'find',
        fingerprint: 'Author:find:{}',
        callSite: 'author.js:8',
        count: 6,
      },
    ];

    const result = analyzeRecords(records, { threshold: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].model).toBe('User'); // count 10
    expect(result[1].model).toBe('Author'); // count 6
    expect(result[2].model).toBe('Product'); // count 4
  });

  it('should preserve relative order (stable sort) for records with identical counts', () => {
    const records: QueryRecord[] = [
      {
        model: 'FirstUser',
        operation: 'find',
        fingerprint: 'FirstUser:find:{}',
        callSite: 'user.js:10',
        count: 5,
      },
      {
        model: 'SecondUser',
        operation: 'find',
        fingerprint: 'SecondUser:find:{}',
        callSite: 'user.js:20',
        count: 5,
      },
      {
        model: 'ThirdUser',
        operation: 'find',
        fingerprint: 'ThirdUser:find:{}',
        callSite: 'user.js:30',
        count: 5,
      },
    ];

    const result = analyzeRecords(records, { threshold: 3 });
    expect(result).toHaveLength(3);
    // Stable sort check: relative order must remain unchanged
    expect(result[0].model).toBe('FirstUser');
    expect(result[1].model).toBe('SecondUser');
    expect(result[2].model).toBe('ThirdUser');
  });

  it('should work correctly with an extreme threshold of 1', () => {
    const records: QueryRecord[] = [
      {
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{}',
        callSite: 'user.js:10',
        count: 1,
      },
    ];

    const result = analyzeRecords(records, { threshold: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('User');
    expect(result[0].count).toBe(1);
  });
});
