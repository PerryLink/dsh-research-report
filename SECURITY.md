# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through GitHub's private vulnerability reporting:

**https://github.com/PerryLink/dsh-research-report/security/advisories/new**

That flow keeps the report confidential while we triage, and it is the channel we watch first.

## Before you report

- **Redact sensitive data** from any logs or session excerpts you attach: tokens, API keys, secrets, Authorization/request headers, personal paths, and account identifiers.
- Include, when possible: the plugin version, the harness (`dsh`) version, Node and OS versions, and the minimal steps to reproduce.

## What to expect

- **Acknowledgment**: within 5 business days.
- **Triage**: within 10 business days we confirm the issue and assess severity, or ask for more details.
- **Fix**: security fixes are prepared in a private fork, released as a patch version, and announced in the release notes.

## Disclosure and credit

- We follow coordinated disclosure: a public advisory (and CVE request where appropriate) is published once a fix ships.
- Reporters are credited in the advisory unless they ask to remain anonymous. There is no bug bounty program at this time.

## Scope

This plugin is a local evidence ledger and report sealer. Its guarantees are:

- **Workspace confinement** — local evidence reads resolve against the workspace root and refuse escapes; writes stay inside the configured `ledgerRoot`/`reportRoot`.
- **No direct network** — URL capture and topic gathering ride the harness `ctx.web` seam (provider selection, error taxonomy, and any SSRF policy belong to the deployment's web providers); the plugin itself performs no `fetch` and handles no credentials.
- **Tamper-evidence** — snapshot integrity is recomputed on every read; a mismatch never silently passes: bound claims verify `contradicted` and queries report the integrity state.
- **Fail-loud configuration** — every tunable is validated at mount.

Evidence content captured from the web or the workspace is data, and it is rendered into reports as data; like any research tooling, snapshots of hostile pages deserve the deployment's prompt-injection defenses (e.g. dsh-defend).

Vulnerabilities in the harness itself should be reported to the official harness maintainers instead.
