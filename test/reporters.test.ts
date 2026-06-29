import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractQueryShape, formatQueryLine, suggestFix } from '../src/reporters/format-finding';
import { ConsoleReporter } from '../src/reporters/console';
import { JsonReporter } from '../src/reporters/json';
import type { Finding } from '../src/types';

describe('Format Finding Helpers', () => {
  describe('extractQueryShape', () => {
    it('should correctly parse the JSON shape from a valid fingerprint', () => {
      const finding: Finding = {
        model: 'User',
        operation: 'findById',
        fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
        count: 1,
        callSite: 'app.js:10',
      };
      const shape = extractQueryShape(finding);
      expect(shape).toEqual({ _id: '<ObjectId>' });
    });

    it('should return {} and not throw if the fingerprint suffix has invalid JSON', () => {
      const finding: Finding = {
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{"unclosed": "brace"',
        count: 1,
        callSite: 'app.js:10',
      };
      expect(() => {
        const shape = extractQueryShape(finding);
        expect(shape).toEqual({});
      }).not.toThrow();
    });

    it('should return {} if fingerprint does not start with model/operation prefix', () => {
      const finding: Finding = {
        model: 'User',
        operation: 'find',
        fingerprint: 'OtherModel:otherOp:{"id":1}',
        count: 1,
        callSite: 'app.js:10',
      };
      const shape = extractQueryShape(finding);
      expect(shape).toEqual({});
    });
  });

  describe('formatQueryLine', () => {
    it('should output operation({}) when shape is empty', () => {
      const finding: Finding = {
        model: 'User',
        operation: 'find',
        fingerprint: 'User:find:{}',
        count: 1,
        callSite: 'app.js:10',
      };
      const queryLine = formatQueryLine(finding);
      expect(queryLine).toBe('find({})');
    });

    it('should format shape keys and tags without quote marks', () => {
      const finding: Finding = {
        model: 'Post',
        operation: 'findOne',
        fingerprint: 'Post:findOne:{"authorId":"<ObjectId>","status":"<string>"}',
        count: 2,
        callSite: 'app.js:15',
      };
      const queryLine = formatQueryLine(finding);
      expect(queryLine).toBe('findOne({ authorId: <ObjectId>, status: <string> })');
    });

    it('should render standard values (numbers, booleans, null, nested shapes) correctly', () => {
      const finding: Finding = {
        model: 'Post',
        operation: 'find',
        fingerprint: 'Post:find:{"age":{"$gt":"<number>"},"active":true,"deletedAt":"<null>"}',
        count: 2,
        callSite: 'app.js:15',
      };
      const queryLine = formatQueryLine(finding);
      expect(queryLine).toBe('find({ age: { $gt: <number> }, active: true, deletedAt: <null> })');
    });
  });

  describe('suggestFix', () => {
    it('should return populate/in recommendation for find, findOne, and findById', () => {
      const findOp: Finding = {
        model: 'User',
        operation: 'find',
        fingerprint: '',
        count: 1,
        callSite: '',
      };
      const findByIdOp: Finding = {
        model: 'User',
        operation: 'findById',
        fingerprint: '',
        count: 1,
        callSite: '',
      };

      const expectedText = 'use .populate() or batch this with a single query using $in';
      expect(suggestFix(findOp)).toBe(expectedText);
      expect(suggestFix(findByIdOp)).toBe(expectedText);
    });

    it('should return a generic bulkWrite/batching suggestion for other operations', () => {
      const updateOneOp: Finding = {
        model: 'User',
        operation: 'updateOne',
        fingerprint: '',
        count: 1,
        callSite: '',
      };
      const expectedText =
        'consider batching this operation instead of calling it in a loop (e.g. bulkWrite)';
      expect(suggestFix(updateOneOp)).toBe(expectedText);
    });
  });
});

describe('ConsoleReporter Class', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not invoke console.warn when findings list is empty', () => {
    const reporter = new ConsoleReporter();
    reporter.report([]);
    expect(console.warn).toHaveBeenCalledTimes(0);
  });

  it('should invoke console.warn exactly once per finding with correctly formatted warning blocks', () => {
    const reporter = new ConsoleReporter();
    const findings: Finding[] = [
      {
        model: 'Author',
        operation: 'findById',
        fingerprint: 'Author:findById:{"_id":"<ObjectId>"}',
        count: 5,
        callSite: 'routes/posts.js:14',
      },
      {
        model: 'Post',
        operation: 'updateOne',
        fingerprint: 'Post:updateOne:{"title":"<string>"}',
        count: 3,
        callSite: 'routes/posts.js:25',
      },
    ];

    reporter.report(findings);
    expect(console.warn).toHaveBeenCalledTimes(2);

    const call1 = vi.mocked(console.warn).mock.calls[0][0];
    const call2 = vi.mocked(console.warn).mock.calls[1][0];

    // Check first call
    expect(call1).toContain('[mongoosleuth] N+1 detected');
    expect(call1).toContain('model: Author');
    expect(call1).toContain('query: findById({ _id: <ObjectId> })');
    expect(call1).toContain('called 5 times in routes/posts.js:14');
    expect(call1).toContain('fix: use .populate() or batch this with a single query using $in');

    // Check second call
    expect(call2).toContain('[mongoosleuth] N+1 detected');
    expect(call2).toContain('model: Post');
    expect(call2).toContain('query: updateOne({ title: <string> })');
    expect(call2).toContain('called 3 times in routes/posts.js:25');
    expect(call2).toContain(
      'fix: consider batching this operation instead of calling it in a loop (e.g. bulkWrite)'
    );
  });
});

describe('JsonReporter Class', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not invoke write callback when findings list is empty', () => {
    const writeSpy = vi.fn();
    const reporter = new JsonReporter(writeSpy);

    reporter.report([]);
    expect(writeSpy).toHaveBeenCalledTimes(0);
  });

  it('should invoke write callback once per finding with valid JSON containing metadata', () => {
    const writeSpy = vi.fn();
    const reporter = new JsonReporter(writeSpy);
    const findings: Finding[] = [
      {
        model: 'Author',
        operation: 'findById',
        fingerprint: 'Author:findById:{}',
        count: 5,
        callSite: 'routes/posts.js:14',
      },
      {
        model: 'Post',
        operation: 'find',
        fingerprint: 'Post:find:{}',
        count: 3,
        callSite: 'routes/posts.js:20',
      },
    ];

    reporter.report(findings);
    expect(writeSpy).toHaveBeenCalledTimes(2);

    const line1 = writeSpy.mock.calls[0][0];
    const line2 = writeSpy.mock.calls[1][0];

    const obj1 = JSON.parse(line1);
    const obj2 = JSON.parse(line2);

    expect(obj1.type).toBe('mongoosleuth_finding');
    expect(obj1.model).toBe('Author');
    expect(obj1.count).toBe(5);
    expect(isNaN(Date.parse(obj1.timestamp))).toBe(false); // Valid date string check

    expect(obj2.type).toBe('mongoosleuth_finding');
    expect(obj2.model).toBe('Post');
    expect(obj2.count).toBe(3);
    expect(isNaN(Date.parse(obj2.timestamp))).toBe(false);
  });

  it('should default write parameter to console.log and run without throwing', () => {
    const reporter = new JsonReporter();
    const findings: Finding[] = [
      {
        model: 'Author',
        operation: 'findById',
        fingerprint: 'Author:findById:{}',
        count: 5,
        callSite: 'routes/posts.js:14',
      },
    ];

    expect(() => {
      reporter.report(findings);
    }).not.toThrow();

    expect(console.log).toHaveBeenCalledTimes(1);
    const printedLine = vi.mocked(console.log).mock.calls[0][0];
    const obj = JSON.parse(printedLine);
    expect(obj.type).toBe('mongoosleuth_finding');
    expect(obj.model).toBe('Author');
  });
});
