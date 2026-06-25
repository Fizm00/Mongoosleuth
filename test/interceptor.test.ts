/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runInScope, getActiveRecords } from '../src/scope';
import { attachInterceptor, __resetForTests } from '../src/interceptor';

// Prevent OverwriteModelError by checking if models already exist
const authorSchema = new mongoose.Schema({
  name: String,
});
const Author =
  mongoose.models.AuthorInterceptorTest || mongoose.model('AuthorInterceptorTest', authorSchema);

const postSchema = new mongoose.Schema({
  title: String,
  authorId: mongoose.Schema.Types.ObjectId,
});
const Post =
  mongoose.models.PostInterceptorTest || mongoose.model('PostInterceptorTest', postSchema);

describe('Mongoose Query Interceptor Integration', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 600000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    // Reset Mongoose's Query.prototype.exec back to original to avoid test pollution
    __resetForTests(mongoose);
    // Clear collections
    await Author.deleteMany({});
    await Post.deleteMany({});
  });

  it('should group Author.findById calls from the same line with count: 3', async () => {
    attachInterceptor(mongoose, { enabled: true, captureStackTrace: true });

    // Create 3 authors to query
    const a1 = await Author.create({ name: 'A1' });
    const a2 = await Author.create({ name: 'A2' });
    const a3 = await Author.create({ name: 'A3' });

    const ids = [a1._id, a2._id, a3._id];

    let records: any;
    await runInScope(async () => {
      // Must execute from the same line of code to have the same callSite
      for (const id of ids) {
        await Author.findById(id).exec();
      }
      records = getActiveRecords();
    });

    expect(records).toBeDefined();
    expect(records).toHaveLength(1);
    expect(records[0].model).toBe('AuthorInterceptorTest');
    expect(records[0].count).toBe(3);
    expect(records[0].callSite).not.toBe('unknown');

    // Print Mongoose operations to console for verifying internal normalization
    console.log(`[Dev Log] operation for findById: ${records[0].operation}`);
  });

  it('should separate two completely different query structures', async () => {
    attachInterceptor(mongoose, { enabled: true, captureStackTrace: true });

    let records: any;
    await runInScope(async () => {
      await Author.findById(new mongoose.Types.ObjectId()).exec();
      await Author.find({ name: 'A1' }).exec();
      records = getActiveRecords();
    });

    expect(records).toHaveLength(2);
    const operations = records.map((r: any) => r.operation);
    // findById translates to findOne under the hood in Mongoose
    expect(operations).toContain('findOne');
    expect(operations).toContain('find');
  });

  it('should execute query outside of any scope without throwing', async () => {
    attachInterceptor(mongoose, { enabled: true, captureStackTrace: true });

    // Should run successfully and return result without throwing
    const author = await Author.create({ name: 'Outside Scope Author' });
    const found = await Author.findById(author._id).exec();
    expect(found).toBeDefined();
    expect(found!.name).toBe('Outside Scope Author');

    // Active records should be undefined outside scope
    expect(getActiveRecords()).toBeUndefined();
  });

  it('should not record anything when options.enabled is false', async () => {
    attachInterceptor(mongoose, { enabled: false, captureStackTrace: true });

    let records: any;
    await runInScope(async () => {
      await Author.find({ name: 'A1' }).exec();
      records = getActiveRecords();
    });

    expect(records).toEqual([]);
  });

  it('should ignore queries matching options.ignore', async () => {
    attachInterceptor(mongoose, {
      enabled: true,
      captureStackTrace: true,
      ignore: [{ model: 'AuthorInterceptorTest' }],
    });

    let records: any;
    await runInScope(async () => {
      await Author.find({ name: 'A1' }).exec();
      await Post.find({ title: 'P1' }).exec();
      records = getActiveRecords();
    });

    expect(records).toHaveLength(1);
    expect(records[0].model).toBe('PostInterceptorTest');
  });

  it('should be idempotent and not cause double-counting when attached multiple times', async () => {
    // Attach twice
    attachInterceptor(mongoose, { enabled: true, captureStackTrace: true });
    attachInterceptor(mongoose, { enabled: true, captureStackTrace: true });

    let records: any;
    await runInScope(async () => {
      await Author.find({ name: 'A1' }).exec();
      records = getActiveRecords();
    });

    expect(records).toHaveLength(1);
    expect(records[0].count).toBe(1); // Crucial: must be 1, not 2
  });

  it('should group queries under callSite "unknown" when captureStackTrace is false', async () => {
    attachInterceptor(mongoose, { enabled: true, captureStackTrace: false });

    let records: any;
    await runInScope(async () => {
      // Called from two different lines of code
      await Author.find({ name: 'A1' }).exec();
      await Author.find({ name: 'A1' }).exec();
      records = getActiveRecords();
    });

    expect(records).toHaveLength(1);
    expect(records[0].count).toBe(2);
    expect(records[0].callSite).toBe('unknown');
  });
});
