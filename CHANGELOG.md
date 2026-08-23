# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Close the §2.32 "confirm or add" checklist items with executable assertions (no functional change): a tool triple-interface suite (U2 — parameter schema + canonical output schema + content-block render for `evidence_add` / `research_report` / `ledger_query`), a Loader-level `maxEvidencePerReport` out-of-range negative (U4), a dispose test proving the service and all three tools unregister on unmount (C1), a `FETCH_TIMEOUT` path test over the real `ctx.web` seam (U5/U6), and a frozen `CitationCheckRequest` boundary assertion in the `dsh-data-quality` bridge suite (cross-plugin bridge).

### Changed

- Confirm the frozen `CitationCheckRequest` / `CitationCheckResult` block is byte-identical to the real `dsh-data-quality` Service Definition (already gated byte-for-byte by `scripts/verify-frozen-contract.mjs`).

## [0.1.3] - 2026-08-22

### Changed

- Upgrade the `@deepseek-ai/dsh-*` peer family from `0.1.0-rc.8` to `0.1.1-rc.2`: devDependencies pin `0.1.1-rc.2` exactly, peerDependencies stay `>=0.1.0-rc.8 <0.2.0`, and the compat workflow pins the rc.2 family. No plugin API surface changed — the adaptive session-event mirror still applies, because the live `Session.append` still exposes no `ignorable` option and `research-report/*` events remain outside the host's `KNOWN_SESSION_EVENT_TYPES` (the ledger journals stay the durable source of truth).
- The five-language READMEs, `AGENTS.md`, and `THIRD_PARTY_NOTICES.md` now document the `0.1.1-rc.2` peer family.

## [0.1.2] - 2026-08-21

### Changed

- Upgrade the `@deepseek-ai/dsh-*` peer family from `0.1.0-rc.6` to `0.1.0-rc.8`: devDependencies pin `0.1.0-rc.8` exactly, peerDependencies widen to `>=0.1.0-rc.8 <0.2.0`, and the pnpm workspace catalog plus the compat workflow pin the rc.8 family. No plugin API surface changed — the adaptive session-event mirror still applies, because the rc.8 live `Session.append` exposes no `ignorable` option and `research-report/*` events remain outside the host's `KNOWN_SESSION_EVENT_TYPES` (the ledger journals stay the durable source of truth).
- The five-language READMEs, `AGENTS.md`, and `THIRD_PARTY_NOTICES.md` now document the `0.1.0-rc.8` peer family.

## [0.1.1] - 2026-08-19

### Fixed

- `dshWorkshop` manifest conformance for OMDSH Workshop intake: permission token `network:ctx-web-only` (schema-safe, no dots) and capability kind `service` (enum).
- Release workflow now publishes to npm with provenance (`npm publish --access public --provenance`); the 0.1.0 tarball predates this fix, so provenance applies from the next release.

## [0.1.0] - 2026-08-19

### Added

- Content-addressed evidence ledger (`<ledgerRoot>/objects/<sha256>` + JSONL journals for evidence, claims, and verdicts): same-content dedupe, immutable snapshots, and read-time re-hashing that flips tampered or deleted objects to `integrity: tampered`/`missing`.
- `ctx.researchReport` service seam (Service Definition / local Provider / tool Consumers in one package) with the byte-frozen `assemble(request)` contract for sibling plugins, gated by `scripts/verify-frozen-contract.mjs`.
- Byte-level claim verification: number and quote literals must be locatable verbatim in the bound snapshots; absent claimed values whose label appears with a different snapshot value verdict `contradicted`; optional numeric cross-checks bridge to `ctx.dataQuality.verifyCitations` when that sibling plugin is mounted.
- Versioned sealed reports under `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/` (`report.md` + `manifest.json`), sealed by the manifest SHA-256, with visible `[未核实]` / `[与证据矛盾]` body markers and a complete Appendix A verification table.
- Model tools `evidence_add` (inline / workspace-file / URL-via-`ctx.web` capture), `research_report` (assemble + seal; `gather: true` candidate round that never auto-assembles; `background: true` over `ctx.jobs`), and `ledger_query` (read-only bindings/verdicts with live integrity).
- Typed `research-report/evidence`, `research-report/verify`, and `research-report/seal` session events (declared via `SessionEventMap` merging; appended adaptively only when the host build knows the types, since rc.6 has no `ignorable` marker or plugin event-registration surface — the ledger journals remain the durable source of truth).
- Fail-loud Schemastery config (`enabled`, `ledgerRoot`, `reportRoot`, `maxEvidenceBytes`, `maxEvidencePerReport`, `fetchTimeoutMs`), real `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` vitest coverage against the 0.1.0-rc.6 peers, a keyless fixture end-to-end flow including the tamper→contradicted path, and a real Loader composition suite over the built entry.
