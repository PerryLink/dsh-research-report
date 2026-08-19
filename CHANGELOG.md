# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Content-addressed evidence ledger (`<ledgerRoot>/objects/<sha256>` + JSONL journals for evidence, claims, and verdicts): same-content dedupe, immutable snapshots, and read-time re-hashing that flips tampered or deleted objects to `integrity: tampered`/`missing`.
- `ctx.researchReport` service seam (Service Definition / local Provider / tool Consumers in one package) with the byte-frozen `assemble(request)` contract for sibling plugins, gated by `scripts/verify-frozen-contract.mjs`.
- Byte-level claim verification: number and quote literals must be locatable verbatim in the bound snapshots; absent claimed values whose label appears with a different snapshot value verdict `contradicted`; optional numeric cross-checks bridge to `ctx.dataQuality.verifyCitations` when that sibling plugin is mounted.
- Versioned sealed reports under `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/` (`report.md` + `manifest.json`), sealed by the manifest SHA-256, with visible `[未核实]` / `[与证据矛盾]` body markers and a complete Appendix A verification table.
- Model tools `evidence_add` (inline / workspace-file / URL-via-`ctx.web` capture), `research_report` (assemble + seal; `gather: true` candidate round that never auto-assembles; `background: true` over `ctx.jobs`), and `ledger_query` (read-only bindings/verdicts with live integrity).
- Typed `research-report/evidence`, `research-report/verify`, and `research-report/seal` session events (declared via `SessionEventMap` merging; appended adaptively only when the host build knows the types, since rc.6 has no `ignorable` marker or plugin event-registration surface — the ledger journals remain the durable source of truth).
- Fail-loud Schemastery config (`enabled`, `ledgerRoot`, `reportRoot`, `maxEvidenceBytes`, `maxEvidencePerReport`, `fetchTimeoutMs`), real `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` vitest coverage against the 0.1.0-rc.6 peers, a keyless fixture end-to-end flow including the tamper→contradicted path, and a real Loader composition suite over the built entry.
