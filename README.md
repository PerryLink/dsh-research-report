<div align="center">

# 📑 dsh-research-report
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-research-report)

**A verifiable research-report engine for DeepSeek Harness.**

*Every claim is bound to immutable evidence snapshots, verified byte-for-byte, and sealed into a versioned report whose manifest hash anyone can recompute.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-research-report/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-research-report/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-research-report?label=version)](https://github.com/PerryLink/dsh-research-report/releases)
[![npm version](https://img.shields.io/npm/v/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)
[![npm downloads](https://img.shields.io/npm/dm/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `0.1.1-rc.2` (peers pinned to `0.1.1-rc.2`).
- Node `^22.19.0 || >=24.0.0`, ESM only (`"type": "module"`).
- Peer dependencies: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, and `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs` at `0.1.1-rc.2`.
- Optional siblings (never required): `ctx.web` providers for URL capture/gather, `ctx.jobs` for background assembly, `ctx.dataQuality` (dsh-data-quality) for dataset citation cross-checks.

## What you get

- **Evidence ledger** — a content-addressed snapshot store (`<ledgerRoot>/objects/<sha256>` + JSONL journals). The same content is stored exactly once; snapshots are immutable; every read recomputes the hash, so tampering or deletion is detected instead of trusted.
- **Claim ↔ evidence binding** — claims register with the evidence ids they rely on; the ledger keeps the binding and every verification verdict (latest wins).
- **Byte-level verification** — every number and quoted span in a claim must be locatable verbatim in the bound snapshots. Missing citations mark the claim `unverified`; a label whose snapshot value differs (the claimed value absent) marks it `contradicted`. No semantics, no embeddings — auditable byte checks.
- **Optional numeric bridge** — when a claim cites a structured workspace dataset (CSV/JSON) and `dsh-data-quality` is mounted, citations are cross-checked with tolerances through its frozen `verifyCitations` contract.
- **Versioned sealed reports** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json`; the seal hash is the SHA-256 of the manifest, which itself carries the report hash and every evidence hash.
- **Honest gaps** — unverified and contradicted claims keep a visible `[未核实]` / `[与证据矛盾]` marker in the report body and are listed in Appendix A. Nothing is silently passed.
- **No deep-research loop** — retrieval orchestration is deliberately reused: `ctx.web` for search/fetch, `ctx.jobs` for long runs. Planning and synthesis stay with the model (or an upstream plugin).

## Quick start

### git channel

```sh
# From a scratch profile (pins the commit; runs the self-contained `prepare` build)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-research-report#<sha>"
# The profile's pnpm-workspace.yaml gains an allowBuilds entry for dsh-research-report on first add.
```

### npm channel

```sh
dsh plugin --profile demo add dsh-research-report
```

Both channels install the bundle row (see `cordis.patch.yml`) into the profile's `dsh.profile.bundles` stack and take effect on restart.

Then, in a session:

```
evidence_add({ origin: "docs/market.md", title: "Market snapshot" })     # → ev-1a2b3c4d5e6f
research_report({ topic: "示例行业概览", sections: [...], claims: [...], evidenceRefs: ["ev-1a2b…"] })
ledger_query({ claimId: "c1" })                                          # bindings + verdict
```

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # install
dsh plugin --profile demo remove dsh-research-report    # uninstall
```

Verify the row mounts: `dsh --profile demo --dump-config | grep dsh-research-report`.

## Configuration

All tunables are Schemastery `Config` fields; invalid values fail the profile load loudly. Relative roots resolve against the harness working directory (the workspace).

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master switch; `false` mounts nothing. |
| `ledgerRoot` | `.research-ledger` | Evidence-ledger directory (objects + JSONL journals). |
| `reportRoot` | `research-reports` | Sealed-report root (versioned per topic and timestamp). |
| `maxEvidenceBytes` | `2097152` | Hard cap on one evidence snapshot's UTF-8 bytes. |
| `maxEvidencePerReport` | `200` | Hard cap on evidence items bound into one report. |
| `fetchTimeoutMs` | `20000` | Deadline (ms) for one `ctx.web` fetch during capture. |

## Tools & surfaces

- **`evidence_add({ origin, content?, title? })`** — register one evidence snapshot. With `content` the text is stored verbatim; without it a URL origin is fetched through `ctx.web` and a workspace-relative path is read from disk (reads never escape the workspace). Returns the evidence id and SHA-256 hash.
- **`research_report({ topic, title?, sections, claims, evidenceRefs, gather?, depth?, background? })`** — assemble and seal a report: validate (unregistered claim references are rejected loudly), verify every claim, render `report.md` with visible markers, write `manifest.json`, and return the seal hash. `gather: true` runs ONE search round over `ctx.web` and returns captured candidate evidence plus an explicit gap list — it never auto-assembles. `background: true` returns `{ kind: 'background', jobId }` over `ctx.jobs`.
- **`ledger_query({ claimId? | evidenceId? })`** — read-only binding/verdict queries; evidence is re-hashed on read so a tampered or missing snapshot is reported explicitly. With no id, returns a ledger summary.
- **`ctx.researchReport.assemble(request)`** — the frozen service surface for sibling plugins (see `src/service.ts`; gated byte-for-byte by `scripts/verify-frozen-contract.mjs`).

## Permissions & data

`dsh-research-report` consumes only public seams: `ctx.tools`, `ctx.systemPrompt`, and optionally `ctx.web` / `ctx.jobs` / `ctx.dataQuality` (looked up at call time, never injected). It writes only inside the configured ledger and report roots (both default to workspace-local directories), reads workspace files only inside the workspace, and reaches the network exclusively through the harness web seam — never a direct `fetch`. Evidence snapshots are immutable and content-addressed; claim registrations are immutable; verdicts are append-only.

## Security boundaries

- **Tamper-evidence by construction** — every snapshot read recomputes SHA-256 against the index; a mismatch verifies the bound claims `contradicted` and `ledger_query` reports `integrity: tampered`/`missing`.
- **Workspace confinement** — local evidence reads resolve against the workspace root and refuse escapes (both sides are `path.resolve`d before comparison).
- **Fail-loud configuration** — invalid bounds throw at mount; unregistered claim references, unknown evidence ids, and id/content conflicts throw at assemble.
- **No credential handling, no hidden network** — URL capture rides `ctx.web` (provider selection, error taxonomy, and any SSRF policy stay with the deployment's web providers).
- **Reversible registrations** — every contribution goes through `ctx.effect()` / `register()`, so uninstall and hot reload are clean.

## Known limitations

- **Byte-level, not semantic** — the built-in check locates number/quote literals verbatim; paraphrased claims without a checkable literal verify as `unverified`, and a true claim whose number is absent while its label appears with a different value reads `contradicted`. This is a deliberate v1 choice (auditable beats clever).
- **Session events are adaptive** — the plugin declares typed `research-report/evidence`, `research-report/verify`, and `research-report/seal` session events, but the rc.2 `Session.append` still exposes no `ignorable` option and no plugin event-registration surface, so appends activate only when the host build knows the types (otherwise the persistence layer would refuse the log on restore). The ledger journals are always the durable source of truth.
- **Default profiles mount no fetch provider** — the shipped `dsh-base` mounts search only, so URL capture fails loud (`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`) until a fetch provider is configured; search-based `gather` lists uncaptured sources in the gap list.
- **Single-workspace scope** — ledger and report roots resolve against the harness working directory at mount; multi-workspace deployments should configure absolute roots per profile.

## Development

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci
pnpm test
pnpm run build
pnpm run verify:self-contained && pnpm run verify:artifacts
node scripts/check-readme-sync.mjs
node scripts/verify-frozen-contract.mjs
pnpm pack
```

- `typecheck` resolves `@deepseek-ai/*` through the installed 0.1.1-rc.2 peers; `typecheck:ci` clears `skipLibCheck` and enables `verbatimModuleSyntax` against the published types. Both must stay green.
- Tests use the real `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` from the 0.1.1-rc.2 peers; only network backends are scripted providers registered through the real `ctx.web` registries.
- Release: `node scripts/release.mjs <x.y.z>` (bumps, stamps CHANGELOG, re-runs the gate, commits + tags; never pushes).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — original author and maintainer: plugin architecture, evidence ledger, byte-level verification, sealed reports, five-language documentation, CI and release automation.

## PerryLink DSH Plugin Family

This project is one of the DeepSeek Harness plugins maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| [dsh-data-quality](https://github.com/PerryLink/dsh-data-quality) | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Engineering-discipline guard: requirements grill, test gates, adversary review |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Read-only performance diagnostics for DeepSeek Harness. |
| [dsh-industry-research](https://github.com/PerryLink/dsh-industry-research) | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |
| [dsh-score](https://github.com/PerryLink/dsh-score) | Multi-dimensional quality scoring for DeepSeek Harness plugins. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |

## License

Apache-2.0 — see [LICENSE](LICENSE).
