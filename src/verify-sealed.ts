/**
 * Read-only sealed-report verification: a deterministic, zero-network,
 * zero-model fallback that recomputes the seal and audit hashes and re-runs the
 * byte-level + integrity claim check. The optional model verifier (spawned over
 * `ctx.jobs`) is an enhancement over this machine check, never a replacement.
 * @module dsh-research-report/verify-sealed
 */

import path from 'node:path'
import { sha256Of } from './ledger.ts'
import { verifyClaimText } from './verify.ts'
import type { ReportManifest } from './assemble.ts'
import type { EvidenceIntegrity, VerdictStatus } from './service.ts'
import { VERSION } from './version.ts'

/** One claim's re-check within the sealed-report verification. */
export interface SealedVerificationClaim {
  /** The claim id. */
  claimId: string
  /** The status recorded in the manifest. */
  recorded: VerdictStatus
  /** The status recomputed by the byte-level + integrity re-check. */
  recomputed: VerdictStatus
  /** True when the recomputed status matches the recorded one. */
  match: boolean
}

/** The deterministic sealed-report verification result. */
export interface SealedVerificationResult {
  /** Recomputed SHA-256 of manifest.json. */
  sealHash: string
  /** True when the recomputed seal hash equals the expected one. */
  sealHashMatches: boolean
  /** True when the recomputed report.md hash matches manifest.reportSha256. */
  reportHashMatches: boolean
  /** True when the audit journal hashes match the manifest registrations. */
  journalHashesMatch: boolean
  /** Per-claim re-checks. */
  claimChecks: SealedVerificationClaim[]
  /** True when the gap section (Appendix A) is present. */
  gapSectionPresent: boolean
  /** True when the disproof section (Appendix D) is present. */
  disproofSectionPresent: boolean
  /** True when every hash check passed and the sections are present. */
  ok: boolean
}

/** Filesystem + ledger dependencies injected for testability. */
export interface SealedVerificationDeps {
  /** Read one file by absolute path. */
  readFile(file: string): Promise<string>
  /** Read one evidence snapshot's bytes + integrity, or undefined when unknown. */
  readEvidenceContent(id: string): Promise<{ content: string; integrity: EvidenceIntegrity } | undefined>
}

/** Read one optional journal; a missing journal is an empty string. */
async function readOptional(deps: SealedVerificationDeps, file: string): Promise<string> {
  try {
    return await deps.readFile(file)
  } catch {
    return ''
  }
}

/**
 * Deterministically verify a sealed report directory: recompute the seal hash,
 * the report hash, and the audit-journal hashes, re-run the byte-level +
 * integrity check for every claim, and confirm the gap/disproof sections exist.
 * Zero network, zero model.
 * @param reportDir - the sealed report directory.
 * @param expectedSealHash - the seal hash returned at assemble time.
 * @param deps - file and evidence readers.
 * @returns the verification result.
 */
export async function verifySealedReport(
  reportDir: string,
  expectedSealHash: string,
  deps: SealedVerificationDeps,
): Promise<SealedVerificationResult> {
  const manifestText = await deps.readFile(path.join(reportDir, 'manifest.json'))
  const reportText = await deps.readFile(path.join(reportDir, 'report.md'))
  const sealHash = sha256Of(manifestText)
  const manifest = JSON.parse(manifestText) as ReportManifest

  const reportHashMatches = sha256Of(reportText) === manifest.reportSha256

  const verificationText = await readOptional(deps, path.join(reportDir, 'verification.jsonl'))
  const disconfirmationText = await readOptional(deps, path.join(reportDir, 'disconfirmation.jsonl'))
  const verificationMatches = manifest.verification === undefined
    ? verificationText === ''
    : sha256Of(verificationText) === manifest.verification.sha256
  const disconfirmationMatches = manifest.disconfirmation === undefined
    ? disconfirmationText === ''
    : sha256Of(disconfirmationText) === manifest.disconfirmation.sha256
  const journalHashesMatch = verificationMatches && disconfirmationMatches

  // A tampered/corrupt manifest may not carry the claim/verdict arrays; the
  // seal-hash recompute is the primary signal, so degrade to an empty re-check
  // rather than crashing.
  const claims = Array.isArray(manifest.claims) ? manifest.claims : []
  const verdicts = Array.isArray(manifest.verdicts) ? manifest.verdicts : []
  const claimChecks: SealedVerificationClaim[] = []
  for (const claim of claims) {
    const recorded = verdicts.find(verdict => verdict.claimId === claim.id)?.status ?? 'unverified'
    const contents: string[] = []
    let integrityFailed = false
    for (const evidenceId of claim.evidenceIds) {
      const read = await deps.readEvidenceContent(evidenceId)
      if (read === undefined || read.integrity !== 'ok') {
        integrityFailed = true
        break
      }
      contents.push(read.content)
    }
    const recomputed: VerdictStatus = integrityFailed ? 'contradicted' : verifyClaimText(claim.text, contents).status
    claimChecks.push({ claimId: claim.id, recorded, recomputed, match: recorded === recomputed })
  }

  const gapSectionPresent = reportText.includes('## Appendix A: Claim verification')
  const disproofSectionPresent = reportText.includes('## Appendix D: Disconfirmation log')
  const sealHashMatches = sealHash === expectedSealHash
  const ok = sealHashMatches && reportHashMatches && journalHashesMatch && gapSectionPresent && disproofSectionPresent
  return {
    sealHash,
    sealHashMatches,
    reportHashMatches,
    journalHashesMatch,
    claimChecks,
    gapSectionPresent,
    disproofSectionPresent,
    ok,
  }
}

/**
 * Render the machine-check section of `verifier-note.md` (deterministic).
 * @param result - the sealed-report verification result.
 * @returns the machine-check markdown (no trailing newline).
 */
export function renderMachineCheckMarkdown(result: SealedVerificationResult): string {
  const lines = [
    `- Seal hash (sha256 of manifest.json): \`${result.sealHash}\` → ${result.sealHashMatches ? 'MATCH' : 'MISMATCH'}`,
    `- Report hash (sha256 of report.md): → ${result.reportHashMatches ? 'MATCH' : 'MISMATCH'}`,
    `- Audit journal hashes (verification.jsonl + disconfirmation.jsonl): → ${result.journalHashesMatch ? 'MATCH' : 'MISMATCH'}`,
    `- Claims re-checked: ${result.claimChecks.filter(check => check.match).length}/${result.claimChecks.length} status match`,
    `- Gap section (Appendix A): ${result.gapSectionPresent ? 'present' : 'MISSING'}`,
    `- Disproof section (Appendix D): ${result.disproofSectionPresent ? 'present' : 'MISSING'}`,
    `- Overall: ${result.ok ? 'OK' : 'FAILED'}`,
  ]
  const mismatches = result.claimChecks.filter(check => !check.match)
  if (mismatches.length > 0) {
    lines.push('', 'Claim re-check mismatches:')
    for (const check of mismatches) {
      lines.push(`- ${check.claimId}: recorded ${check.recorded}, recomputed ${check.recomputed}`)
    }
  }
  return lines.join('\n')
}

// ── Standalone output formats (SARIF 2.1.0 + JSON) ──────────────────────────

/** The SARIF 2.1.0 schema URI. */
export const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json'

/** The tool name recorded in both output formats. */
export const VERIFIER_TOOL = 'dsh-research-report-verify'

/** The JSON report emitted by the standalone verifier. */
export interface VerificationReport {
  /** Tool name. */
  tool: typeof VERIFIER_TOOL
  /** Discriminator of the verification report (version 1). */
  schema: 'dsh-research-report/verification@v1'
  /** Producer version. */
  version: string
  /** The verified report directory. */
  reportDir: string
  /** The expected seal hash, or null when none was supplied (not compared). */
  expectedSealHash: string | null
  /** True/false when a seal was compared, null when none was supplied. */
  sealHashMatches: boolean | null
  /** Recomputed SHA-256 of manifest.json. */
  sealHash: string
  /** True when the recomputed report.md hash matches manifest.reportSha256. */
  reportHashMatches: boolean
  /** True when the audit journal hashes match the manifest registrations. */
  journalHashesMatch: boolean
  /** True when the gap section (Appendix A) is present. */
  gapSectionPresent: boolean
  /** True when the disproof section (Appendix D) is present. */
  disproofSectionPresent: boolean
  /** Number of claims whose status was re-checked. */
  claimsChecked: number
  /** Number of claims whose recomputed status matched the recorded one. */
  claimsMatched: number
  /** Per-claim re-checks. */
  claimChecks: SealedVerificationClaim[]
  /** Whether claim re-checks ran (`rechecked`) or were skipped for missing evidence (`skipped-no-ledger`). */
  claimRecheck: 'rechecked' | 'skipped-no-ledger'
  /** True when every performed check passed. */
  ok: boolean
}

/**
 * Build the standalone verification report envelope from a core result.
 * `ok` is the conjunction of every check that actually ran: the seal
 * comparison only contributes when an expected seal was supplied.
 * @param result - the core sealed-report verification result.
 * @param reportDir - the verified report directory.
 * @param expectedSealHash - the supplied seal hash, or null when none.
 * @param claimRecheck - whether claim re-checks ran.
 * @returns the envelope.
 */
export function buildVerificationReport(
  result: SealedVerificationResult,
  reportDir: string,
  expectedSealHash: string | null,
  claimRecheck: 'rechecked' | 'skipped-no-ledger' = 'rechecked',
): VerificationReport {
  const sealHashMatches = expectedSealHash === null ? null : result.sealHashMatches
  const ok = (sealHashMatches === null || sealHashMatches)
    && result.reportHashMatches
    && result.journalHashesMatch
    && result.gapSectionPresent
    && result.disproofSectionPresent
  return {
    tool: VERIFIER_TOOL,
    schema: 'dsh-research-report/verification@v1',
    version: VERSION,
    reportDir,
    expectedSealHash,
    sealHashMatches,
    sealHash: result.sealHash,
    reportHashMatches: result.reportHashMatches,
    journalHashesMatch: result.journalHashesMatch,
    gapSectionPresent: result.gapSectionPresent,
    disproofSectionPresent: result.disproofSectionPresent,
    claimsChecked: claimRecheck === 'rechecked' ? result.claimChecks.length : 0,
    claimsMatched: claimRecheck === 'rechecked' ? result.claimChecks.filter(check => check.match).length : 0,
    claimChecks: claimRecheck === 'rechecked' ? result.claimChecks : [],
    claimRecheck,
    ok,
  }
}

/** Serialize one verification report as pretty-printed JSON. */
export function renderVerificationJson(report: VerificationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}

/** SARIF rule metadata keyed by rule id. */
const SARIF_RULES: Array<{ id: string; shortDescription: string }> = [
  { id: 'seal-hash-mismatch', shortDescription: 'Recomputed seal hash does not match the expected seal' },
  { id: 'seal-hash-not-compared', shortDescription: 'No expected seal hash was supplied to compare against' },
  { id: 'report-hash-mismatch', shortDescription: 'report.md hash does not match manifest.reportSha256' },
  { id: 'journal-hash-mismatch', shortDescription: 'Audit journal hashes do not match the manifest registrations' },
  { id: 'missing-gap-section', shortDescription: 'Appendix A (claim verification) is missing' },
  { id: 'missing-disproof-section', shortDescription: 'Appendix D (disconfirmation log) is missing' },
  { id: 'claim-verdict-mismatch', shortDescription: 'A claim re-check produced a different verdict than recorded' },
  { id: 'claim-recheck-skipped', shortDescription: 'Claim re-checks were skipped because no evidence root was supplied' },
]

/** One SARIF result under construction. */
interface SarifResult {
  ruleId: string
  level: 'error' | 'warning' | 'note'
  message: { text: string }
  locations: Array<{ physicalLocation: { artifactLocation: { uri: string } } }>
}

/**
 * Render one verification report as a SARIF 2.1.0 document. Every failed check
 * becomes a result (`error` for hash/section failures, `warning` for per-claim
 * verdict mismatches); a missing expected seal becomes a `note`.
 * @param report - the verification report.
 * @returns the SARIF 2.1.0 JSON text.
 */
export function renderSarif(report: VerificationReport): string {
  const results: SarifResult[] = []
  const add = (ruleId: string, level: SarifResult['level'], text: string, uri: string): void => {
    results.push({ ruleId, level, message: { text }, locations: [{ physicalLocation: { artifactLocation: { uri } } }] })
  }
  if (report.sealHashMatches === false) {
    add('seal-hash-mismatch', 'error', `seal hash ${report.sealHash} does not match the expected seal`, 'manifest.json')
  } else if (report.sealHashMatches === null) {
    add('seal-hash-not-compared', 'note', `seal hash ${report.sealHash} computed but no expected seal was supplied`, 'manifest.json')
  }
  if (!report.reportHashMatches) add('report-hash-mismatch', 'error', 'report.md hash does not match manifest.reportSha256', 'report.md')
  if (!report.journalHashesMatch) add('journal-hash-mismatch', 'error', 'audit journal hashes do not match the manifest registrations', 'verification.jsonl')
  if (!report.gapSectionPresent) add('missing-gap-section', 'error', 'Appendix A (claim verification) is missing from report.md', 'report.md')
  if (!report.disproofSectionPresent) add('missing-disproof-section', 'error', 'Appendix D (disconfirmation log) is missing from report.md', 'report.md')
  if (report.claimRecheck === 'skipped-no-ledger') {
    add('claim-recheck-skipped', 'note', 'claim re-checks skipped: no --ledger evidence root was supplied', 'manifest.json')
  }
  for (const check of report.claimChecks) {
    if (!check.match) add('claim-verdict-mismatch', 'warning', `claim ${check.claimId}: recorded ${check.recorded}, recomputed ${check.recomputed}`, 'manifest.json')
  }
  const document = {
    $schema: SARIF_SCHEMA,
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: VERIFIER_TOOL,
          informationUri: 'https://github.com/PerryLink/dsh-research-report',
          version: report.version,
          rules: SARIF_RULES.map(rule => ({ id: rule.id, shortDescription: { text: rule.shortDescription } })),
        },
      },
      results,
    }],
  }
  return `${JSON.stringify(document, null, 2)}\n`
}
