## What this changes

<!-- One paragraph: the user-visible behavior this PR adds or fixes. -->

## Checklist

- [ ] Full gate is green locally: `pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm run verify:frozen-contract && node scripts/check-readme-sync.mjs && pnpm pack`
- [ ] Tests were added or updated for the changed behavior
- [ ] `CHANGELOG.md` has an `[Unreleased]` entry for the change
- [ ] Multi-language READMEs are in sync with the English source (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`)
- [ ] Related issues are linked (if any)
- [ ] No secrets, tokens, or personal data are included in this PR