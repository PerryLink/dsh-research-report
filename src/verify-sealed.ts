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
