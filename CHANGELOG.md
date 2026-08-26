# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-08-26

### Added

- Standalone verifier CLI with SARIF/JSON output for offline citation verification.

### Fixed

- Exclude the self-executing verifier CLI entry from coverage (CI).

## [0.2.0] - 2026-08-23

### Added

- Pre-delivery re-audit with verdict drift detection: `assemble` re-runs the byte-level (and optional numeric-bridge) verification for every bound claim offline before sealing, journals each re-audit to `verification.jsonl` (claim hash + evidence object hashes + timestamp + verdict + prior/drift flags, deterministically serialized), and downgrades a claim whose stored verdict was `verified` but whose re-audit no longer confirms to `contradicted` (counted in the report summary and the tool result). The journal is sealed with the report and registered in the manifest as an optional `verification` field, so the seal hash covers it.
- Explicit `insufficient` verdict state in the claim/verdict layer (evidence is bound but insufficient to confirm or falsify — a citation not locatable with no contradiction signal); rendered with the `[证据不足]` body marker and the `🔍 insufficient` Appendix A row. The frozen `CitationCheckRequest`/`CitationCheckResult` block and the frozen three-state `AssembleReportResult` surface are unchanged; `insufficient` folds to `unverified` only at the frozen cross-plugin projection.
- `disconfirmation.jsonl` falsification ledger in the sealed directory: every contradicted claim with its evidence references and contradiction note, deterministically serialized, re-hashable, registered in the manifest as an optional `disconfirmation` field, and rendered as the `Appendix D: Disconfirmation log (证伪记录)` section.
- Pre-seal interception (no tunable): before writing `report.md`/`manifest.json`, the pre-delivery re-audit's hard signals — verdict drift, tampered/missing bound evidence, or an audit-journal serialization failure — block the seal and fail loud (`SealBlockedError`) with the concrete reasons listed.
- `disproven` verdict state: the byte-level check now marks a label-anchored value mismatch as `disproven` (evidence content explicitly falsifies the claim), and the numeric-bridge mismatch maps to `disproven` too, while `contradicted` is reserved for tampered/missing evidence. Rendered with the `[已证伪]` body marker and the `🚫 disproven` Appendix A/D row.
- Negative-knowledge ledger (`disproofs.jsonl`, keyed by claim content hash): a disproven claim is remembered; the same text re-reported against unchanged evidence is forced back to `disproven` (blocking a re-report as `verified`), and only re-verifies once the bound evidence changes. `disconfirmation.jsonl` now records both `contradicted` and `disproven` entries.
- Deterministic DOI validation (zero network) for `evidence_add`: `10.xxxx/xxxx` structure, a recognized-prefix whitelist, and a DOI character-set constraint; invalid DOIs fail loud (`INVALID_DOI`) and DOI evidence requires inline content (never fetched).
- `requireJournalMetadata` config (default `false`): when enabled, DOI-typed evidence missing a journal name or publication year fails loud (`MISSING_JOURNAL_METADATA`); non-DOI evidence is never gated.
- Read-only verifier loop: after sealing, a deterministic `verifySealedReport` fallback (zero network, zero model) recomputes the seal hash, the report hash, and the audit-journal hashes, re-runs the byte-level + integrity check for every claim, and confirms the gap/disproof sections; its machine-check section is written to `verifier-note.md`. When `ctx.jobs` is mounted a read-only `research-report-verify` job is also spawned (the model review is an enhancement); without jobs it is skipped gracefully (`verifier: skipped (jobs unavailable)`).
- `sessionRef` evidence anchor: `evidence_add` accepts an optional `sessionId` + `eventRange` anchor (validated loud), stored in the ledger, rendered in Appendix B, and registered in the manifest and `verification.jsonl`. Session-anchored evidence verifies honestly as `unverified` with the note `会话锚定证据需人工回查会话日志` (no fabricated verifiability).

### Changed

- `VerdictStatus` is now five states (`verified`/`unverified`/`insufficient`/`contradicted`/`disproven`); `projectFrozenVerdict` keeps the frozen three-state `AssembleReportResult` surface unchanged (`insufficient` → `unverified`, `disproven` → `contradicted`).

### Deviations

Explicitly not implemented (and why):

- **(a) Online three-source cross-validation (Crossref / Semantic Scholar / OpenAlex)** — this repository performs no direct network access; a lookup would ride `ctx.web` and therefore depend on the host's web providers. The offline deterministic re-audit already covers the anti-fabrication mainline, so the online cross-check was deliberately left out.
- **(b) Interactive evidence-ledger Slot UI** — a visual ledger panel needs a new client-side surface and packaging changes; it is out of scope for this batch.
- **(c) Zotero literature-library integration** — depends on an external application protocol.
- **(d) Lean 4 / formal-verification channel** — a heavy, domain-specific asset outside this plugin's scope.

## [0.1.4] - 2026-08-23

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
