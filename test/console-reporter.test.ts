/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { formatFinding, ConsoleReporter } from '../src/reporters/console';
import type { Finding } from '../src/types';

describe('Console Reporter Formatting', () => {
  it('should correctly format a finding with a simple JSON shape and 2-space indentation', () => {
    const finding: Finding = {
      model: 'User',
      operation: 'findById',
      fingerprint: 'User:findById:{"_id":"<ObjectId>"}',
      count: 5,
      callSite: 'routes/users.js:12',
    };

    const formatted = formatFinding(finding, { color: false });
    const expected = `[mongoosleuth] N+1 detected
  model: User
  query: findById({ _id: <ObjectId> })
  called 5 times in routes/users.js:12
  fix: looks like a loop — consider .populate() if this is a relation
  on the parent document, or batch with { _id: { $in: [...] } } if
  you're fetching documents one by one.`;

    expect(formatted).toBe(expected);
  });

  it('should render type tags containing numbers without quotes', () => {
    const finding: Finding = {
      model: 'Post',
      operation: 'find',
      fingerprint:
        'Post:find:{"tags":["<string>"],"score":{"$gt":"<number>"},"meta":{"ver":"<number>"}}',
      count: 3,
      callSite: 'controllers/posts.js:45',
    };

    const formatted = formatFinding(finding, { color: false });
    expect(formatted).toContain(
      'query: find({ tags: [<string>], score: { $gt: <number> }, meta: { ver: <number> } })'
    );
  });

  it('should fall back to raw fingerprint shape if JSON parsing fails and not throw', () => {
    const finding: Finding = {
      model: 'User',
      operation: 'find',
      fingerprint: 'User:find:invalid-json-shape-string',
      count: 3,
      callSite: 'user.js:5',
    };

    let formatted = '';
    expect(() => {
      formatted = formatFinding(finding, { color: false });
    }).not.toThrow();

    expect(formatted).toContain('query: find(invalid-json-shape-string)');
  });

  it('should add ANSI yellow escape codes to the header when color is true', () => {
    const finding: Finding = {
      model: 'User',
      operation: 'find',
      fingerprint: 'User:find:{}',
      count: 3,
      callSite: 'user.js:5',
    };

    const formatted = formatFinding(finding, { color: true });
    expect(formatted.startsWith('\x1b[33m[mongoosleuth] N+1 detected\x1b[0m')).toBe(true);
  });

  it('should not add ANSI yellow escape codes to the header when color is false', () => {
    const finding: Finding = {
      model: 'User',
      operation: 'find',
      fingerprint: 'User:find:{}',
      count: 3,
      callSite: 'user.js:5',
    };

    const formatted = formatFinding(finding, { color: false });
    expect(formatted.startsWith('[mongoosleuth] N+1 detected')).toBe(true);
    expect(formatted).not.toContain('\x1b[');
  });
});

describe('ConsoleReporter Class', () => {
  class MockWritableStream {
    public chunks: string[] = [];
    public isTTY: boolean;

    constructor(isTTY = false) {
      this.isTTY = isTTY;
    }

    write(chunk: any) {
      this.chunks.push(chunk.toString());
      return true;
    }
  }

  it('should not write anything to the stream if findings list is empty', () => {
    const stream = new MockWritableStream();
    const reporter = new ConsoleReporter({ stream: stream as any });

    reporter.report([]);
    expect(stream.chunks).toHaveLength(0);
  });

  it('should write formatted string with a single trailing newline and no trailing blank line for one finding', () => {
    const stream = new MockWritableStream();
    const reporter = new ConsoleReporter({ stream: stream as any, color: false });
    const finding: Finding = {
      model: 'User',
      operation: 'find',
      fingerprint: 'User:find:{}',
      count: 3,
      callSite: 'user.js:5',
    };

    reporter.report([finding]);
    expect(stream.chunks).toHaveLength(1);
    expect(stream.chunks[0].endsWith('\n')).toBe(true);
    expect(stream.chunks[0].endsWith('\n\n')).toBe(false);
  });

  it('should separate multiple findings with a double newline and keep original ordering', () => {
    const stream = new MockWritableStream();
    const reporter = new ConsoleReporter({ stream: stream as any, color: false });
    const findingA: Finding = {
      model: 'Author',
      operation: 'findById',
      fingerprint: 'Author:findById:{}',
      count: 10,
      callSite: 'author.js:5',
    };
    const findingB: Finding = {
      model: 'Post',
      operation: 'find',
      fingerprint: 'Post:find:{}',
      count: 4,
      callSite: 'post.js:12',
    };

    reporter.report([findingA, findingB]);
    expect(stream.chunks).toHaveLength(1);

    const output = stream.chunks[0];
    const pieces = output.split('\n\n');
    expect(pieces).toHaveLength(2);
    expect(pieces[0]).toContain('model: Author');
    expect(pieces[1]).toContain('model: Post');
  });

  it('should automatically enable color if stream is a TTY and no explicit color option is passed', () => {
    const ttyStream = new MockWritableStream(true);
    const nonTtyStream = new MockWritableStream(false);

    const reporterTty = new ConsoleReporter({ stream: ttyStream as any });
    const reporterNonTty = new ConsoleReporter({ stream: nonTtyStream as any });

    const finding: Finding = {
      model: 'User',
      operation: 'find',
      fingerprint: 'User:find:{}',
      count: 3,
      callSite: 'user.js:5',
    };

    reporterTty.report([finding]);
    reporterNonTty.report([finding]);

    expect(ttyStream.chunks[0]).toContain('\x1b[33m');
    expect(nonTtyStream.chunks[0]).not.toContain('\x1b[33m');
  });
});
