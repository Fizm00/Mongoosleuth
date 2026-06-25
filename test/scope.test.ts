import { describe, it, expect } from 'vitest';
import { runInScope, recordQuery, getActiveRecords } from '../src/scope';

describe('Request Scope Tracking (AsyncLocalStorage)', () => {
  it('should return undefined when calling getActiveRecords outside any scope', () => {
    expect(getActiveRecords()).toBeUndefined();
  });

  it('should not throw when calling recordQuery outside any scope', () => {
    expect(() => {
      recordQuery({
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{}',
        callSite: 'app.js:10',
      });
    }).not.toThrow();
  });

  it('should isolate sequential runInScope calls', async () => {
    await runInScope(async () => {
      expect(getActiveRecords()).toEqual([]);
      recordQuery({
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{}',
        callSite: 'app.js:10',
      });
      const records = getActiveRecords();
      expect(records).toHaveLength(1);
      expect(records![0].count).toBe(1);
    });

    // Second sequential scope (should start completely fresh)
    await runInScope(async () => {
      expect(getActiveRecords()).toEqual([]);
      recordQuery({
        model: 'Product',
        operation: 'findOne',
        fingerprint: 'Product:findOne:{"id":"<string>"}',
        callSite: 'product.js:25',
      });
      const records = getActiveRecords();
      expect(records).toHaveLength(1);
      expect(records![0].model).toBe('Product');
      expect(records![0].count).toBe(1);
    });
  });

  it('should isolate concurrent runInScope calls (Promise.all)', async () => {
    const scope1 = runInScope(async () => {
      recordQuery({
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{"scope":1}',
        callSite: 'user.js:5',
      });
      // Simulate asynchronous delay to allow interleaving
      await new Promise((resolve) => setTimeout(resolve, 50));
      const records = getActiveRecords();
      expect(records).toHaveLength(1);
      expect(records![0].fingerprint).toBe('User:find:{"scope":1}');
      return records;
    });

    const scope2 = runInScope(async () => {
      // Deliberately delay recording slightly to ensure interleaving
      await new Promise((resolve) => setTimeout(resolve, 20));
      recordQuery({
        model: 'Product',
        operation: 'find',
        fingerprint: 'Product:find:{"scope":2}',
        callSite: 'product.js:8',
      });
      const records = getActiveRecords();
      expect(records).toHaveLength(1);
      expect(records![0].fingerprint).toBe('Product:find:{"scope":2}');
      return records;
    });

    const [res1, res2] = await Promise.all([scope1, scope2]);
    expect(res1).toHaveLength(1);
    expect(res2).toHaveLength(1);
    expect(res1![0].fingerprint).toBe('User:find:{"scope":1}');
    expect(res2![0].fingerprint).toBe('Product:find:{"scope":2}');
  });

  it('should increment count for duplicate query fingerprints at the same callsite instead of creating duplicates', async () => {
    await runInScope(async () => {
      const query = {
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:20',
      };

      recordQuery(query);
      recordQuery(query);
      recordQuery(query);

      const records = getActiveRecords();
      expect(records).toHaveLength(1);
      expect(records![0]).toEqual({
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:20',
        count: 3,
      });
    });
  });

  it('should preserve scope across nested await calls and asynchronous boundaries', async () => {
    async function fetchProfile() {
      recordQuery({
        model: 'Profile',
        operation: 'findOne',
        fingerprint: 'Profile:findOne:{"userId":"<ObjectId>"}',
        callSite: 'profile.js:12',
      });
    }

    async function fetchUser() {
      recordQuery({
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        callSite: 'user.js:30',
      });
      await new Promise((resolve) => setTimeout(resolve, 15));
      await fetchProfile();
    }

    await runInScope(async () => {
      await fetchUser();
      const records = getActiveRecords();
      expect(records).toHaveLength(2);
      const models = records!.map((r) => r.model);
      expect(models).toContain('User');
      expect(models).toContain('Profile');
    });
  });
});
