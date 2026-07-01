# Security policy

## Supported versions

Only the latest minor release of Mongoosleuth receives security fixes.
If you are on an older version, upgrade first before reporting a vulnerability.

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |
| Older   | No        |

---

## Reporting a vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.** A public
issue exposes the details to everyone before a fix is available, which puts
all current users at risk.

Instead, please use one of the following private channels:

**Option 1 — GitHub private vulnerability reporting (preferred)**
GitHub has a built-in mechanism for this. On the repository page, go to
`Security` → `Advisories` → `Report a vulnerability`. This creates a private
thread visible only to you and the maintainer, and lets us collaborate on a
fix and a coordinated disclosure without exposing anything publicly.

**Option 2 — Direct email**
If you prefer email, send a report to the address listed in the `author`
field of `package.json`. Encrypt your message with the maintainer's GPG key
if you are reporting something particularly sensitive — the key fingerprint
will be published in this file once it is available.

---

## What to include in your report

A good report makes it faster to verify, reproduce, and fix the issue. Please
include:

- A clear description of the vulnerability and what an attacker could do
  with it.
- The version of Mongoosleuth where you found it.
- A minimal reproduction: the shortest possible code that demonstrates the
  issue. If you have a working proof of concept, include it — this is strongly
  encouraged and is not considered irresponsible as long as you send it
  privately.
- Whether you believe this is exploitable in practice (even a rough
  assessment helps prioritize).

---

## What happens after you report

- **Within 48 hours:** You will receive an acknowledgement confirming the
  report was received.
- **Within 7 days:** You will receive an initial assessment: whether the
  report is accepted as a valid vulnerability, whether more information is
  needed, or whether it is out of scope (with an explanation).
- **For accepted reports:** A fix will be developed privately and released as
  a patch version. The release notes will credit you by name (or as anonymous,
  if you prefer) and a CVE will be requested if the severity warrants it.
- **Coordinated disclosure:** We ask for a 90-day embargo from the date of
  the initial report before any public disclosure. If a fix cannot be
  delivered in that window, we will communicate the timeline honestly and
  work with you on a reasonable extension.

---

## Scope

The following are considered in scope for security reports:

- A bug in Mongoosleuth that causes it to **log or expose raw query values**
  (actual field values from the database, not type tags). This is the most
  critical category, since users trust this library to be safe against
  databases containing sensitive or regulated data.
- A bug that allows **cross-request data leakage** — query records from one
  HTTP request appearing in the findings of a different, concurrent request.
  This would undermine the core isolation guarantee of AsyncLocalStorage.
- A vulnerability in Mongoosleuth's own code that allows **arbitrary code
  execution or prototype pollution** when processing a crafted Mongoose query
  or configuration input.

The following are generally considered out of scope:

- Vulnerabilities in Mongoose itself, `mongodb-memory-server`, or other
  dependencies. Please report those to the respective projects.
- The library being disabled in production via `enabled: false` is not a
  vulnerability — that is expected behavior.
- Denial of service through excessive logging in a tight query loop. The
  `threshold` option and `enabled: false` in production are the intended
  mitigations for this.

If you are unsure whether something is in scope, report it anyway — it is
always better to over-report than to stay silent about something real.

---

## Attribution

Security researchers who report valid vulnerabilities will be credited in the
release notes of the fix unless they request to remain anonymous. We do not
currently offer a bug bounty program.
