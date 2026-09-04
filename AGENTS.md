# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-research-report`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO default export). Injects `tools` and `systemPrompt` only; `web`/`jobs`/`dataQuality` are optional and resolved with `ctx.get` at call time so a composition without them still mounts (the affected paths fail loud with an explicit reason).
- `src/service.ts` — Service Definition: `ResearchReportService` (`ctx.researchReport`), the BYTE-FROZEN `assemble` contract block (sibling plugins consume it; `scripts/verify-frozen-contract.mjs` gates drift), the typed `research-report/*` session events, and the `research-report` job-kind merge.
- `src/ledger.ts` — the content-addressed evidence ledger (pure Node, zero DSH imports): `objects/<sha256>` + `index.jsonl`/`claims.jsonl`/`verdicts.jsonl`, dedupe, id-conflict refusal, read-time re-hash (`ok`/`tampered`/`missing`).
- `src/verify.ts` — the byte-level checker (number/quote literals must locate verbatim; presence-first, label-anchored contradiction when the claimed value is absent) plus the BYTE-FROZEN `CitationCheckRequest`/`CitationCheckResult` bridge types for the optional `ctx.dataQuality` consumption.
- `src/assemble.ts` — pure assembly: request validation (loud `RequestValidationError`), `report.md` rendering with visible `[未核实]`/`[与证据矛盾]` markers, deterministic `manifest.json`, seal = SHA-256 of the manifest bytes.
- `src/gather.ts` — capture (URL via `ctx.web`, workspace file via `node:fs` with an escape-refusing path guard) and the `gather` candidate round (never auto-assembles; uncaptured sources land in the gap list).
- `src/provider-local.ts` — the local Provider (`LocalResearchReportService`): policy caps, ledger orchestration, verdict writeback, adaptive session-event append, seal directory allocation.
- `src/tools/` — the three Consumers: `evidence_add`, `research_report` (sealed | background | gathered branches), `ledger_query`.
- `scripts/` — `prepare.mjs` (self-contained build), `verify-self-contained.mjs`, `verify-artifacts.mjs`, `check-readme-sync.mjs` (five-language gate), `verify-frozen-contract.mjs` (cross-plugin contract gate), `loader-runner.mjs` (real Loader composition runner), `release.mjs` (bump + stamp + gate + commit + tag, never pushes), `changelog-section.mjs`, `fix-dts.mjs`.
- `test/` — vitest; REAL `Context`/`SessionStore`/`Session`/`SystemPrompt`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` from the 0.1.2-rc.1 peers. Only the network backends are scripted providers registered through the real `ctx.web` registries; background-job tests run unowned (the minimal harness agent is not enrolled in a real agents registry, which job-ownership validation requires).
- `fixtures/` — three local documents for the keyless end-to-end flow (evidence → seal → tamper → contradicted).

## Hard rules applied here

- **The ledger is the source of truth; session events are an adaptive mirror.** The 0.1.2-rc.1 `Session.append` still exposes no `ignorable` option and no plugin event-registration surface, so `research-report/*` events append only when `KNOWN_SESSION_EVENT_TYPES` knows them — otherwise the persistence layer would refuse the log on restore. Never append unconditionally.
- **Snapshots are immutable.** Same content dedupes; an id reused with different content fails loud; a "tampered" object is never "repaired" — verification over it yields `contradicted`.
- **Gaps and contradictions are explicit.** Unverified/contradicted claims keep body markers and populate Appendix A; gather never fabricates evidence and never auto-assembles.
- **No tunables hardcoded.** Every knob is a validated `Config` field with a default in `src/config.ts`, an inline comment in `cordis.patch.yml`, and a row in the five-language README configuration table.
- **No direct network, no workspace escape.** All HTTP goes through `ctx.web`; local reads resolve against the workspace root with both sides `path.resolve`d before comparison.
- **This plugin registers no waterfall listeners.** If one is ever added, allow/passthrough MUST call `next()`.
- **Frozen contracts stay byte-exact.** The `assemble` block in `src/service.ts` and the `CitationCheck*` block in `src/verify.ts` are shared verbatim with sibling plugins; `pnpm run verify:frozen-contract` must stay green.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm run verify:frozen-contract && node scripts/check-readme-sync.mjs && pnpm pack`

- `typecheck` resolves `@deepseek-ai/*` through the installed 0.1.2-rc.1 peers; `typecheck:ci` clears `skipLibCheck` and enables `verbatimModuleSyntax` against the published types. Both must stay green.

## Release

`node scripts/release.mjs <x.y.z>` bumps package.json + `src/version.ts`, stamps the CHANGELOG `[Unreleased]` section, re-runs the full gate, and commits + tags (never pushes). `git push origin main --follow-tags` triggers `.github/workflows/release.yml`, which re-runs the gate, publishes to npm with provenance, and creates the GitHub Release from the stamped CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth. `scripts/check-readme-sync.mjs` (CI) enforces section structure and configuration-table keys.
- GitHub topics `dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification` (mirror `package.json` keywords).
- License is Apache-2.0 (`LICENSE` + the package.json `license` field). `THIRD_PARTY_NOTICES.md` documents the build-time dependencies.
