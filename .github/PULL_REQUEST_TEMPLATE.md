## What does this change?

<!-- Describe what you changed and why. Link to the issue this resolves if there is one. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing behavior to change)
- [ ] Documentation or test improvement only

## Checklist

- [ ] I have read `AGENTS.md` and my change is consistent with the architecture and principles described there.
- [ ] `npm run lint` passes locally.
- [ ] `npm run build` passes locally and produces both ESM and CJS output.
- [ ] `npm test` passes locally, including the `mongodb-memory-server` integration tests.
- [ ] I have added tests that cover the change (or explained below why no new tests are needed).
- [ ] The `dependencies` field in `package.json` has not grown. If it has, I have explained why below.
- [ ] If this changes the public API (anything exported from `src/index.ts`), I have updated `README.md` and noted whether this is a breaking change.

## Does this change the public API?

<!-- If yes: what changed, and is it a breaking change (major bump) or a backward-compatible addition (minor bump)? -->

## Does this change `dependencies` in package.json?

<!-- If yes: what was added and why is it unavoidable? -->

## Notes for the reviewer

<!-- Anything specific you want feedback on, tricky edge cases you considered, alternatives you ruled out, etc. -->
