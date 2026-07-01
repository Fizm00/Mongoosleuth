# Contributing to Mongoosleuth

Thank you for taking the time to contribute. This document covers everything
you need to know to go from zero to an open pull request.

## Table of contents

- [Before you start](#before-you-start)
- [Setting up the project locally](#setting-up-the-project-locally)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Coding conventions](#coding-conventions)
- [Writing and running tests](#writing-and-running-tests)
- [Submitting a pull request](#submitting-a-pull-request)
- [Commit message format](#commit-message-format)
- [What makes a good contribution](#what-makes-a-good-contribution)
- [What is explicitly out of scope](#what-is-explicitly-out-of-scope)
- [Reporting bugs](#reporting-bugs)
- [Asking questions](#asking-questions)

---

## Before you start

- Check whether there is already an open issue or pull request covering what
  you want to do. If there is, comment on it rather than opening a duplicate.
- For anything larger than a bug fix or a small documentation change, open an
  issue first and describe what you want to build and why. This saves you from
  spending time on something that might not align with the direction of the
  project.
- Read `AGENTS.md` in the root of this repository. It is the single source of
  truth for architecture decisions, non-negotiable principles, and the exact
  public API contract. Every contribution is held to those rules.

---

## Setting up the project locally

**Prerequisites:** Node.js 18 or higher, npm 9 or higher.

```bash
# 1. Fork the repository, then clone your fork.
git clone https://github.com/<your-username>/mongoosleuth.git
cd mongoosleuth

# 2. Install dependencies.
npm install

# 3. Make sure everything passes before you touch anything.
npm run build
npm test
```

`mongodb-memory-server` downloads a MongoDB binary the first time tests run.
This takes 30–60 seconds on a fresh machine and is cached afterwards — do not
be alarmed if the first `npm test` is slow.

---

## Project structure

```
src/
  index.ts              Public exports only — no logic lives here.
  mongoosleuth.ts       Main class: attach() / middleware() / run()
  scope.ts              AsyncLocalStorage wrapper (request isolation).
  interceptor.ts        Patches mongoose.Query.prototype.exec.
  fingerprint.ts        normalizeFilterShape() + buildFingerprint() — pure functions.
  analyzer.ts           analyzeRecords() — pure function, no I/O.
  reporters/
    console.ts          ConsoleReporter (default).
    json.ts             JsonReporter (ndjson, injectable write function).
    format-finding.ts   Pure formatting helpers (no I/O).
  types.ts              Shared interfaces: MongoosleuthOptions, Finding, Reporter.
test/
  fingerprint.test.ts   Unit tests — no database required.
  scope.test.ts         Unit tests — no database required.
  analyzer.test.ts      Unit tests — no database required.
  reporters.test.ts     Unit tests — no database required.
  interceptor.test.ts   Integration tests — uses mongodb-memory-server.
  mongoosleuth.test.ts  End-to-end tests — uses mongodb-memory-server + supertest.
```

The rule of thumb: `fingerprint.ts`, `analyzer.ts`, and `reporters/format-finding.ts`
are pure functions with zero side effects. Any change that makes them import
from Mongoose, read environment variables, or perform I/O is a mistake.

---

## Development workflow

```bash
npm run build          # compile TypeScript → dist/ (ESM + CJS + .d.ts)
npm test               # run the full test suite
npm run test:watch     # run tests in watch mode while you develop
npm run lint           # ESLint + Prettier check (same check CI runs)
npm run format         # auto-fix formatting with Prettier
```

Build output goes to `dist/`. Never edit files there — they are regenerated
on every build and are not tracked by Git.

---

## Coding conventions

All of these are enforced by the linter, but it helps to understand the intent:

**TypeScript strict mode is on.** Avoid `any`. If you genuinely cannot avoid
it (typically when dealing with Mongoose internals), leave a comment explaining
why — a bare `any` without explanation will be asked to justify itself in
review.

**Named exports everywhere.** `src/index.ts` re-exports things from the
internal modules. Do not add default exports to internal modules — it makes
refactoring harder.

**No `console.log` outside `reporters/console.ts`.** The library must never
produce unexpected output. If you need to debug something during development,
use a temporary `console.error` and make sure it is removed before you open a
PR.

**No runtime dependencies.** This is non-negotiable. `mongoose` belongs in
`peerDependencies` only. If you find yourself adding something to
`dependencies`, stop and find a way to solve the problem with Node.js built-in
modules. If you believe there is a genuine exception, open an issue first.

**Never log raw query values.** Field names and value type tags
(`<ObjectId>`, `<string>`, etc.) are fine. The actual content of any field
is never acceptable — not in logs, not in error messages, not in test
fixtures that end up printed to CI output.

---

## Writing and running tests

Every change that touches logic must come with tests. The bar is:

- Pure function changes (`fingerprint.ts`, `analyzer.ts`, `format-finding.ts`)
  require unit tests only. No database, no AsyncLocalStorage, just input in
  and output out.
- Changes to `scope.ts` require unit tests that include a concurrent
  `Promise.all` scenario, to verify isolation between simultaneous scopes.
- Changes to `interceptor.ts` require integration tests using
  `mongodb-memory-server`. No mocking Mongoose internals — test against the
  real thing.
- Changes to `mongoosleuth.ts` require end-to-end tests using a real Express
  app + `supertest` + `mongodb-memory-server`. The concurrent-request test
  (two requests in `Promise.all`, each producing independent findings) must
  remain in place and passing.

If your change could cause a false positive (reporting N+1 when there is none)
or a false negative (not reporting N+1 when there is one), add a test for
that exact scenario. False positives and false negatives are both release
blockers.

---

## Submitting a pull request

1. Create a branch from `main` with a short, descriptive name:
   `fix/double-attach-warning`, `feat/json-reporter-stream`, etc.
2. Make your changes. Run `npm run lint && npm test` locally until both pass.
3. Open a pull request against `main`. Fill in the PR template (it will
   appear automatically). The key questions it asks:
   - What does this change and why?
   - Does it add, remove, or change any public API? (If yes, is it a
     breaking change that requires a major version bump?)
   - Did `dependencies` in `package.json` change? If so, explain why.
4. CI will run automatically. Do not ask for a review until all checks are
   green.
5. At least one approving review is required before merging. The maintainer
   may ask for changes — this is normal and not a rejection.

---

## Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary in present tense, lowercase>

[optional longer body]

[optional footer: BREAKING CHANGE or Closes #issue]
```

Common types: `fix`, `feat`, `docs`, `test`, `refactor`, `chore`.

Examples:

```
fix(interceptor): prevent double-patching when attach() called twice
feat(reporters): add SlackReporter to reporters/slack.ts
docs(readme): clarify captureStackTrace option behavior
test(scope): add concurrent scope isolation test
```

---

## What makes a good contribution

The best contributions are ones that improve reliability without adding
complexity. In rough order of priority:

- Fixing a bug where Mongoosleuth produces a false positive or false negative.
- Improving test coverage for edge cases in existing behavior.
- Fixing documentation that is confusing or incorrect.
- Adding a new reporter (console and JSON ship by default; others are welcome
  as long as they have no mandatory runtime dependencies of their own).
- Performance improvements — particularly in the stack trace capture path,
  since that is the hottest code on every query.

---

## What is explicitly out of scope

These will be closed without merging:

- Any change that adds a runtime dependency to `dependencies` in
  `package.json`.
- Automatic query rewriting or "fixing" — Mongoosleuth only reports, it never
  touches application code or query behavior.
- Distributed/multi-process aggregation across server instances (this is a
  planned v2 feature and needs a design discussion before any code is written).
- Support for Mongoose versions below 7.

---

## Reporting bugs

Open a GitHub Issue and include:

- Mongoosleuth version (`npm ls mongoosleuth`).
- Mongoose version (`npm ls mongoose`).
- Node.js version (`node --version`).
- A minimal reproduction: the shortest possible code that triggers the bug.
  If the bug involves false positives or false negatives, include the actual
  console output and what you expected instead.

Security vulnerabilities must not be reported as public issues — see
`SECURITY.md`.

---

## Asking questions

For usage questions, open a GitHub Discussion rather than an Issue. Issues are
reserved for confirmed bugs and accepted feature requests.
