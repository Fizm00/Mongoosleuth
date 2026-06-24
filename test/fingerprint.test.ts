import { describe, it, expect } from 'vitest';
import { normalizeFilterShape, buildFingerprint } from '../src/fingerprint';

// Mock ObjectId class to test detection without importing Mongoose
class MockObjectId {
  constructor(private hex: string = '507f1f77bcf86cd799439011') {}
  toHexString() {
    return this.hex;
  }
}

describe('Fingerprint Normalization & Generation', () => {
  it('should normalize primitive values into type tags', () => {
    const filter = {
      name: 'John',
      age: 30,
      active: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      id: new MockObjectId(),
      deletedAt: null,
      updatedAt: undefined,
    };

    const normalized = normalizeFilterShape(filter);

    expect(normalized).toEqual({
      name: '<string>',
      age: '<number>',
      active: '<boolean>',
      createdAt: '<Date>',
      id: '<ObjectId>',
      deletedAt: '<null>',
      updatedAt: '<undefined>',
    });
  });

  it('should normalize two filters with same structure but different literal values to the same fingerprint', () => {
    const filter1 = {
      model: 'User',
      status: 'active',
      age: 25,
      role: 'admin',
    };

    const filter2 = {
      model: 'Product',
      status: 'pending',
      age: 40,
      role: 'user',
    };

    const fp1 = buildFingerprint('User', 'find', filter1);
    const fp2 = buildFingerprint('User', 'find', filter2);

    expect(fp1).toBe(fp2);
    expect(fp1).toBe(
      'User:find:{"age":"<number>","model":"<string>","role":"<string>","status":"<string>"}'
    );
  });

  it('should produce different fingerprints for different structures', () => {
    const filter1 = {
      email: 'user@example.com',
    };
    const filter2 = {
      email: 'user@example.com',
      isAdmin: false,
    };

    const fp1 = buildFingerprint('User', 'find', filter1);
    const fp2 = buildFingerprint('User', 'find', filter2);

    expect(fp1).not.toBe(fp2);
  });

  it('should maintain MongoDB query operators ($gt, $in, $regex, etc.)', () => {
    const filter = {
      age: { $gt: 18 },
      status: { $in: ['active', 'pending'] },
      name: { $regex: /john/i },
    };

    const fp = buildFingerprint('User', 'find', filter);
    expect(fp).toBe(
      'User:find:{"age":{"$gt":"<number>"},"name":{"$regex":"<RegExp>"},"status":{"$in":["<string>"]}}'
    );
  });

  it('should handle empty filter {} consistently without errors', () => {
    const fp = buildFingerprint('User', 'find', {});
    expect(fp).toBe('User:find:{}');
  });

  it('should sort keys alphabetically to produce identical fingerprints regardless of key ordering', () => {
    const filter1 = {
      z: 1,
      a: 2,
      m: { y: 3, x: 4 },
    };
    const filter2 = {
      a: 2,
      z: 1,
      m: { x: 4, y: 3 },
    };

    const fp1 = buildFingerprint('User', 'find', filter1);
    const fp2 = buildFingerprint('User', 'find', filter2);

    expect(fp1).toBe(fp2);
    expect(fp1).toBe(
      'User:find:{"a":"<number>","m":{"x":"<number>","y":"<number>"},"z":"<number>"}'
    );
  });

  it('should only use the first element of an array to represent its shape', () => {
    const filter = {
      tags: ['a', 'b', 'c'],
      scores: [10, 20],
      mixed: [true, 'ignored'],
      empty: [],
    };

    const fp = buildFingerprint('User', 'find', filter);
    expect(fp).toBe(
      'User:find:{"empty":"<empty array>","mixed":["<boolean>"],"scores":["<number>"],"tags":["<string>"]}'
    );
  });
});
