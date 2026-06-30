<div align="center">

<img src="https://raw.githubusercontent.com/Fizm00/Mongoosleuth/main/assets/banner.svg" width="100%" alt="Mongoosleuth Banner"/>

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com/?font=Fira+Code&size=18&pause=1500&color=0F766E&center=true&vCenter=true&width=600&lines=Zero%20runtime%20dependencies.%20Just%20a%20peerDependency.;Catches%20the%20N%2B1%20queries%20Bullet%20catches%20in%20Rails.;Built%20for%20Mongoose.%20Built%20for%20TypeScript." alt="Typing SVG"/>
</a>

<br/>

<img src="https://img.shields.io/npm/v/mongoosleuth?style=for-the-badge&color=0F766E&label=npm" alt="npm version"/>
<img src="https://img.shields.io/badge/dependencies-zero-0F766E?style=for-the-badge" alt="zero dependencies"/>
<img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript ready"/>
<img src="https://img.shields.io/badge/module-ESM%20%2B%20CJS-134E4A?style=for-the-badge" alt="ESM and CJS"/>
<img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js >=18"/>
<img src="https://img.shields.io/github/license/Fizm00/Mongoosleuth?style=for-the-badge&color=134E4A" alt="license"/>
<br/>
<img src="https://img.shields.io/github/stars/Fizm00/Mongoosleuth?style=for-the-badge&color=0F766E" alt="GitHub stars"/>
<img src="https://img.shields.io/github/issues/Fizm00/Mongoosleuth?style=for-the-badge&color=134E4A" alt="GitHub issues"/>
<img src="https://img.shields.io/github/last-commit/Fizm00/Mongoosleuth?style=for-the-badge&color=134E4A" alt="GitHub last commit"/>

<p><strong>A zero-runtime-dependency Node.js + TypeScript library that catches N+1 query
patterns in Mongoose applications before they reach production.</strong></p>
<p>Inspired by Ruby on Rails' <code>Bullet</code> gem — built for an ecosystem that never had one.</p>

</div>

<br/>

## Table of contents

- [The problem](#the-problem)
- [What Mongoosleuth does about it](#what-mongoosleuth-does-about-it)
- [Installation](#installation)
- [Compatibility & Requirements](#compatibility--requirements)
- [Usage](#usage)
  - [Express / Fastify / Koa middleware](#express--fastify--koa-middleware)
  - [Manual scope (background jobs, scripts, anything without HTTP)](#manual-scope-background-jobs-scripts-anything-without-http)
  - [Ignore options](#ignore-options)
  - [Pluggable Custom Reporters](#pluggable-custom-reporters)
- [Configuration Reference](#configuration-reference)
- [How it works](#how-it-works)
- [Technical details: the fingerprinting system](#technical-details-the-fingerprinting-system)
- [FAQ](#faq)
- [Development scripts](#development-scripts)
- [Non-negotiable principles](#non-negotiable-principles)
- [Contributing & Issues](#contributing--issues)
- [Star History](#star-history)
- [Roadmap](#roadmap)
- [License](#license)

<br/>

## The problem

```ts
// Looks completely fine. Isn't.
const posts = await Post.find();

for (const post of posts) {
  // One extra query. Per post. Every single time this route is hit.
  post.author = await User.findById(post.authorId);
}
```

Fifty posts. Fifty-one queries. The response still comes back. Nobody notices —
until the collection grows, the route gets popular, and the database starts
spending more time on this one endpoint than on everything else combined.

This is the N+1 query problem, and in the Ruby on Rails world it has had a
well-known solution for over a decade: the `Bullet` gem watches your queries
in development and tells you exactly where you went wrong. Mongoose has never
had an equivalent. Mongoosleuth is that equivalent.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## What Mongoosleuth does about it

It watches the same code, says nothing while everything is fine, and the
moment that loop fires the same query shape more times than your threshold
allows in a single request, it tells you exactly where to look:

```
[mongoosleuth] N+1 detected
  model: User
  query: findById(<value>)
  called 50 times in routes/posts.ts:14
  fix: use .populate('author') or User.find({ _id: { $in: [...] } })
```

No raw values are ever logged — only field names and value _types_ — so this
is safe to leave running against a database full of real, sensitive, user data.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Installation

```bash
npm install mongoosleuth
```

`mongoose` is a peer dependency, not a regular dependency — make sure it is
already installed in your project.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Compatibility & Requirements

- **Node.js**: `>= 18.0.0`
- **Mongoose**: `^7.0.0 || ^8.0.0`
- **Zero runtime dependencies**: Will not clutter your `node_modules` or increase bundle sizes.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Usage

### Express / Fastify / Koa middleware

```typescript
import mongoose from 'mongoose';
import { Mongoosleuth } from 'mongoosleuth';

const sleuth = new Mongoosleuth({
  enabled: process.env.NODE_ENV !== 'production',
  threshold: 3,
});

// Patch Mongoose's query execution once, at startup.
sleuth.attach(mongoose);

// Open a tracking scope for every incoming request.
app.use(sleuth.middleware());
```

### Manual scope (background jobs, scripts, anything without HTTP)

```typescript
await sleuth.run(async () => {
  const users = await User.find({ status: 'active' });

  for (const user of users) {
    // Tracked and analyzed exactly like a request — fires the same warning
    // if this turns out to be a loop instead of a batched query.
    const profile = await Profile.findOne({ userId: user.id });
  }
});
```

### Ignore options

You can exclude specific collections or operations from N+1 analysis to avoid tracking logs on expected bulk operations:

```typescript
const sleuth = new Mongoosleuth({
  ignore: [
    { model: 'AuditLog' },                      // Ignore all queries on AuditLog collection
    { operation: 'updateOne' },                 // Ignore all updates on any collection
    { model: 'Session', operation: 'findOne' }   // Ignore specific collection-operation pair
  ]
});
```

### Pluggable Custom Reporters

Mongoosleuth comes built-in with `ConsoleReporter` (default) and `JsonReporter` (for NDJSON logging pipelines). You can also easily implement the `Reporter` interface to ship warnings to Slack, Sentry, or S3:

```typescript
import { Mongoosleuth, JsonReporter, Reporter, Finding } from 'mongoosleuth';

class SlackReporter implements Reporter {
  report(findings: Finding[]): void {
    for (const finding of findings) {
      // Post warning to Slack hook
      fetch('https://hooks.slack.com/services/...', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 N+1 Query detected on *${finding.model}* (${finding.count} calls) at ${finding.callSite}`
        })
      });
    }
  }
}

const sleuth = new Mongoosleuth({
  reporters: [
    new SlackReporter(),
    new JsonReporter(line => process.stderr.write(line + '\n'))
  ]
});
```

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Configuration Reference

<details>
<summary><strong>View Configuration Options (MongoosleuthOptions)</strong></summary>

<br/>

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `process.env.NODE_ENV !== 'production'` | Toggle Mongoosleuth N+1 pattern detection. When set to `false`, it acts as a zero-overhead pass-through. |
| `threshold` | `number` | `3` | Number of identical query shapes executed from the same call site within a single scope before triggering a warning. Must be `>= 1`. |
| `captureStackTrace` | `boolean` | `true` | When `true`, automatically identifies the exact file and line number (call site) of queries. Set to `false` for absolute zero-overhead performance (logs will group call sites as `'unknown'`). |
| `ignore` | `Array<{ model?: string; operation?: string }>` | `[]` | Excludes queries matching specific model names or operations from being tracked. |
| `reporters` | `Reporter[]` | `[new ConsoleReporter()]` | Pluggable output handlers that receive identified N+1 query findings. |

</details>

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## How it works

```mermaid
flowchart TD
    A[Incoming request] --> B[Tracking scope opens<br/>AsyncLocalStorage]
    B --> C[Query interceptor<br/>logs every Mongoose query]
    C --> D[Pattern analyzer<br/>flags repeated query patterns]
    D --> E[Reporter<br/>warns in the console]
```

Each request gets its own isolated tracking scope. Every query fired inside
that scope is fingerprinted and logged. When the request finishes, the
analyzer checks whether any fingerprint repeated, from the same line of code,
often enough to be a loop rather than a coincidence — and if so, the reporter
prints it.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Technical details: the fingerprinting system

At the core of the detector is a deterministic fingerprinting function
(`src/fingerprint.ts`) that identifies _the shape_ of a query without ever
touching the actual data inside it.

**1. Normalization.** Every primitive value inside a query filter is replaced
with a tag representing its type, never its value:

| Value type  | Normalized to |
| ----------- | ------------- |
| `string`    | `<string>`    |
| `number`    | `<number>`    |
| `boolean`   | `<boolean>`   |
| `Date`      | `<Date>`      |
| `ObjectId`  | `<ObjectId>`  |
| `RegExp`    | `<RegExp>`    |
| `null`      | `<null>`      |
| `undefined` | `<undefined>` |

MongoDB query operators such as `$gt`, `$in`, or `$regex` are preserved as
part of the shape — they change what the query means, so they are never
collapsed away. Arrays are normalized using the shape of their first element
only; an empty array is tagged `<empty array>`.

**2. Deterministic key sorting.** Object keys are sorted alphabetically at
every nesting level before the fingerprint is built, so field order in your
code never affects detection:

```
{ name: "John", age: 30 } → { age: <number>, name: <string> }
{ age: 30, name: "John" } → { age: <number>, name: <string> }
```

Same fingerprint either way — which is exactly the point.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## FAQ

#### Is it safe to run in production?
Yes, absolutely. When `enabled` is set to `false` (which is the default outside development/staging environments), all of Mongoosleuth's internal hooks are bypassed and act as zero-overhead no-op pass-throughs. Additionally, Mongoosleuth never captures or logs raw query values (PII data is fully protected by substituting types), ensuring complete data privacy.

#### Will this affect my application's performance?
In development (`enabled: true`), capturing stack traces to locate the exact query line (`callSite`) has a minor CPU cost. If you wish to run high-throughput load tests or minimize trace collection overhead, you can set `captureStackTrace: false` to disable call-site tracing and group queries under a single `'unknown'` location.

#### Why not just use built-in database query logging?
Database profilers and query loggers record individual raw queries independently without context of where they originated. Mongoosleuth isolates query shapes per request scope and groups them by their exact code line location. This allows it to distinguish between normal independent query executions and repeated, identical queries fired from a single loop context (N+1 query pattern).

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Development scripts

| Command          | What it does                                                                |
| ---------------- | --------------------------------------------------------------------------- |
| `npm run build`  | Builds dual ESM (`.mjs`) and CommonJS (`.js`) output, plus `.d.ts`/`.d.mts` |
| `npm test`       | Runs the unit and integration suite (Vitest + `mongodb-memory-server`)      |
| `npm run lint`   | Checks code style and TypeScript linter compliance                          |
| `npm run format` | Formats the codebase with Prettier                                          |

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Non-negotiable principles

> Zero runtime dependencies. `mongoose` is a peer dependency, never a
> dependency.
>
> Privacy first. Raw query values are never logged — only field names and
> value type tags.
>
> No shared state. Every request is isolated through `AsyncLocalStorage`; two
> concurrent requests never see each other's query logs.
>
> Dual module output. Full support for ESM and CommonJS consumers, with
> accurate `.d.ts` definitions for both.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Contributing & Issues

We welcome contributions in the form of bug reports, feature suggestions, or pull requests. Please report any issues you encounter via the [GitHub Issues](https://github.com/Fizm00/Mongoosleuth/issues) page.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Fizm00/Mongoosleuth&type=Date)](https://star-history.com/#Fizm00/Mongoosleuth&Date)

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## Roadmap

- **Unused eager loading detection** — flagging a `.populate()` call whose
  result was never actually read, the mirror image of the N+1 problem.

<p align="right"><a href="#table-of-contents">▲ Back to top</a></p>

## License

MIT

<div align="center">
<img src="https://raw.githubusercontent.com/Fizm00/Mongoosleuth/main/assets/footer.svg" width="100%" alt="Mongoosleuth Footer"/>
</div>
