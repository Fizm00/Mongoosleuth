/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Mongoosleuth } from '../src/mongoosleuth';
import { __resetForTests } from '../src/interceptor';
import type { Finding, Reporter } from '../src/types';

// Prevent OverwriteModelError
const authorSchema = new mongoose.Schema({ name: String });
const Author = mongoose.models.SleuthTestAuthor || mongoose.model('SleuthTestAuthor', authorSchema);

describe('Mongoosleuth End-to-End Orchestrator Integration', () => {
  let mongoServer: MongoMemoryServer;

  class TestReporter implements Reporter {
    public findings: Finding[] = [];
    report(findings: Finding[]): void {
      this.findings.push(...findings);
    }
  }

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
    __resetForTests(mongoose);
    await Author.deleteMany({});
  });

  it('should throw an error during instantiation if threshold is less than 1', () => {
    expect(() => new Mongoosleuth({ threshold: 0 })).toThrow(
      '[mongoosleuth] Invalid threshold value: 0'
    );
    expect(() => new Mongoosleuth({ threshold: -5 })).toThrow();
  });

  it('should log a finding when an N+1 loop runs in an Express middleware cycle', async () => {
    const reporter = new TestReporter();
    const sleuth = new Mongoosleuth({
      enabled: true,
      threshold: 3,
      reporters: [reporter],
    });

    sleuth.attach(mongoose);

    // Create authors
    const authors = await Author.create([
      { name: 'A1' },
      { name: 'A2' },
      { name: 'A3' },
      { name: 'A4' },
    ]);
    const ids = authors.map((a) => a._id);

    const app = express();
    app.use(sleuth.middleware());

    app.get('/n1', async (req, res, next) => {
      try {
        // Trigger N+1 loop (called 4 times from the same line)
        for (const id of ids) {
          await Author.findById(id).exec();
        }
        res.status(200).json({ ok: true });
      } catch (err) {
        next(err);
      }
    });

    const response = await request(app).get('/n1');
    expect(response.status).toBe(200);

    // Wait a brief tick for the 'finish' event microtasks to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reporter.findings).toHaveLength(1);
    expect(reporter.findings[0].model).toBe('SleuthTestAuthor');
    expect(reporter.findings[0].count).toBe(4);
    expect(reporter.findings[0].operation).toBe('findOne');
  });

  it('should not log any findings for efficient query patterns (e.g. using $in)', async () => {
    const reporter = new TestReporter();
    const sleuth = new Mongoosleuth({
      enabled: true,
      threshold: 3,
      reporters: [reporter],
    });

    sleuth.attach(mongoose);

    const authors = await Author.create([{ name: 'A1' }, { name: 'A2' }]);
    const ids = authors.map((a) => a._id);

    const app = express();
    app.use(sleuth.middleware());

    app.get('/efficient', async (req, res, next) => {
      try {
        // Single batch query using $in
        await Author.find({ _id: { $in: ids } }).exec();
        res.status(200).json({ ok: true });
      } catch (err) {
        next(err);
      }
    });

    const response = await request(app).get('/efficient');
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(reporter.findings).toHaveLength(0);
  });

  it('should isolate request scopes correctly during concurrent HTTP requests', async () => {
    const reporter = new TestReporter();
    const sleuth = new Mongoosleuth({
      enabled: true,
      threshold: 3,
      reporters: [reporter],
    });

    sleuth.attach(mongoose);

    const authors = await Author.create([
      { name: 'A1' },
      { name: 'A2' },
      { name: 'A3' },
      { name: 'A4' },
      { name: 'A5' },
    ]);
    const ids = authors.map((a) => a._id);

    const app = express();
    app.use(sleuth.middleware());

    app.get('/n1-isolate', async (req, res, next) => {
      try {
        // Trigger N+1 loop (5 calls from same line)
        for (const id of ids) {
          await Author.findById(id).exec();
        }
        res.status(200).json({ ok: true });
      } catch (err) {
        next(err);
      }
    });

    // Execute 2 HTTP requests concurrently
    await Promise.all([request(app).get('/n1-isolate'), request(app).get('/n1-isolate')]);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Must report 2 separate findings (each count: 5, rather than 1 finding with count 10)
    expect(reporter.findings).toHaveLength(2);
    expect(reporter.findings[0].count).toBe(5);
    expect(reporter.findings[1].count).toBe(5);
  });

  it('should be completely transparent and execute without tracking when enabled is false', async () => {
    const reporter = new TestReporter();
    const sleuth = new Mongoosleuth({
      enabled: false,
      threshold: 3,
      reporters: [reporter],
    });

    sleuth.attach(mongoose);

    const authors = await Author.create([{ name: 'A1' }, { name: 'A2' }, { name: 'A3' }]);
    const ids = authors.map((a) => a._id);

    const app = express();
    app.use(sleuth.middleware());

    app.get('/n1-disabled', async (req, res, next) => {
      try {
        for (const id of ids) {
          await Author.findById(id).exec();
        }
        res.status(200).json({ ok: true });
      } catch (err) {
        next(err);
      }
    });

    const response = await request(app).get('/n1-disabled');
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(reporter.findings).toHaveLength(0);
  });

  it('should support run() manual scopes, propagate errors, and still execute reports', async () => {
    const reporter = new TestReporter();
    const sleuth = new Mongoosleuth({
      enabled: true,
      threshold: 3,
      reporters: [reporter],
    });

    sleuth.attach(mongoose);

    const authors = await Author.create([{ name: 'A1' }, { name: 'A2' }, { name: 'A3' }]);
    const ids = authors.map((a) => a._id);

    const action = async () => {
      for (const id of ids) {
        await Author.findById(id).exec();
      }
      throw new Error('Some expected execution error');
    };

    await expect(sleuth.run(action)).rejects.toThrow('Some expected execution error');

    // Reporter must still have registered the N+1 findings generated before the throw
    expect(reporter.findings).toHaveLength(1);
    expect(reporter.findings[0].count).toBe(3);
  });
});
