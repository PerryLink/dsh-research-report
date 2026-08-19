# Release handoff artifacts (§0.3 closing chain)

This directory holds the verbatim artifacts prepared for the release session.
The plugin is developed, all local gates are green, and GitHub/npm write
operations are NOT executable from the current session (no gh binary, npm
ENEEDAUTH, PAT blocked by the mounted dsh-defend guard) — so per the §0.3
rule "permission insufficient: commit locally, stop, hand over the command
list, never fake success", everything executable locally was executed and
the credentialed steps are handed over here. See SUMMARY.md, section
「发布交接（§0.3 收尾链执行状态）」 for the full status and command list.

## Files

- `0xsline-dsh-research-report.patch` — git patch adding the bilingual
  `dsh-research-report` entry (Output & Deliverables category) to
  `README.md` + `README.zh-CN.md` of `0xsline/awesome-deepseek-harness`,
  authored against upstream commit
  `baa2debf23c9859e63e2163887036ecef530f691` (2 files, +1 line each).
  Apply to a fork branch `add/dsh-research-report`, push, and open the PR
  with title `docs: add dsh-research-report` (see SUMMARY.md for the body).

- `omdsh-submission.json` — complete `omdsh-workshop-submission/v2` manifest
  for `omdsh-dev/dsh-hub-workshop` (issue title
  `[Submission] dsh-research-report@0.1.1`). It passed the hub's official
  validator locally (`submission accepted for pending review`; workshop
  HEAD `928cb55b8bb876b8b5d6f278eb849fbefc285dba`).

  `release.ref` is pinned to `b95f2d187b43945693f808382cc3cad6536c5bda`
  (the v0.1.1 release commit on `main`). The `packageManifest` block
  matches `package.json#dshWorkshop` at that commit byte-for-byte. If the
  release session publishes a further version before creating the issue,
  either keep this pinned commit (immutable snapshots remain valid) or
  regenerate the record with `add-release` for the newer version.

## Sanitization

Both files contain only public repository coordinates and the generated
structured manifest: no tokens, secrets, private paths, or machine-local
configuration.
