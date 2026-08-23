/**
 * Report assembly and sealing — pure functions. The provider owns the ledger
 * and the filesystem; this module owns request validation, the `report.md`
 * rendering, the `manifest.json` construction, and the seal hash.
 *
 * Sealing: `report.md` is rendered deterministically from the validated
 * request plus the verdicts; `manifest.json` carries the report hash, every
 * evidence hash, and the verdicts; the seal hash is the SHA-256 of the exact
 * manifest bytes. Recomputing the hashes from the sealed directory always
 * reproduces the seal.
 *
 * @module dsh-research-report/assemble
 */

import { sha256Of } from './ledger.ts'
import type { EvidenceRecord } from './service.ts'
import type { AssembleReportRequest, ClaimVerdict } from './service.ts'

/** The manifest schema tag written into every manifest.json. */
export const MANIFEST_SCHEMA = 'dsh-research-report/v1'

/** Body marker appended after a paragraph per UNVERIFIED claim it cites. */
export const UNVERIFIED_MARK = '[未核实]'

/** Body marker appended after a paragraph per CONTRADICTED claim it cites. */
export const CONTRADICTED_MARK = '[与证据矛盾]'

/** Body marker appended after a paragraph per INSUFFICIENT claim it cites. */
export const INSUFFICIENT_MARK = '[证据不足]'

/** Body marker appended after a paragraph per DISPROVEN claim it cites. */
export const DISPROVEN_MARK = '[已证伪]'

/** A loud assemble-time request validation failure. */
export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RequestValidationError'
  }
}

/**
 * Slug one topic for the report directory name: unicode letters and digits
 * are kept, everything else folds to `-`; empty slugs fall back to `report`.
 * @param topic - the report topic.
 * @returns a filesystem-safe slug of at most 48 characters.
 */
export function slugify(topic: string): string {
  const slug = topic
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48)
  return slug === '' ? 'report' : slug
}

/**
 * Format one timestamp as the version directory id `YYYYMMDD-HHmmss` (UTC).
 * @param at - the time to format.
 * @returns the directory id.
 */
export function versionIdOf(at: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return [
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}`,
    `${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`,
  ].join('-')
}

/**
 * The config fingerprint recorded in every report: a short hash of the
 * resolved runtime knobs, so two reports sealed under different policies are
 * distinguishable at a glance.
 * @param knobs - the policy values that shape assembly output.
 * @returns 16 hex characters of the knobs' SHA-256.
 */
export function configFingerprint(knobs: { maxEvidenceBytes: number; maxEvidencePerReport: number }): string {
  const stable = JSON.stringify({
    maxEvidenceBytes: knobs.maxEvidenceBytes,
    maxEvidencePerReport: knobs.maxEvidencePerReport,
  })
  return sha256Of(stable).slice(0, 16)
}

/**
 * Validate one assemble request; every violation throws (a loud rejection —
 * the caller must fix the request, nothing is silently skipped).
 * @param request - the frozen assemble request.
 * @param limits - the resolved caps.
 */
export function validateAssembleRequest(
  request: AssembleReportRequest,
  limits: { maxEvidenceBytes: number; maxEvidencePerReport: number },
): void {
  if (request.title.trim() === '') throw new RequestValidationError('title must be non-empty')
  if (request.topic.trim() === '') throw new RequestValidationError('topic must be non-empty')
  if (request.sections.length === 0) throw new RequestValidationError('sections must contain at least one section')
  for (const [index, section] of request.sections.entries()) {
    if (section.heading.trim() === '') throw new RequestValidationError(`sections[${index}].heading must be non-empty`)
  }
  if (request.evidence.length > limits.maxEvidencePerReport) {
    throw new RequestValidationError(
      `evidence has ${request.evidence.length} items, above the configured maxEvidencePerReport ${limits.maxEvidencePerReport}`,
    )
  }
  const evidenceIds = new Set<string>()
  for (const item of request.evidence) {
    if (item.id.trim() === '') throw new RequestValidationError('evidence id must be non-empty')
    if (evidenceIds.has(item.id)) throw new RequestValidationError(`duplicate evidence id "${item.id}"`)
    evidenceIds.add(item.id)
    const bytes = Buffer.byteLength(item.content, 'utf8')
    if (bytes > limits.maxEvidenceBytes) {
      throw new RequestValidationError(
        `evidence "${item.id}" is ${bytes} bytes, above the configured maxEvidenceBytes ${limits.maxEvidenceBytes}`,
      )
    }
    if (Number.isNaN(Date.parse(item.capturedAt))) {
      throw new RequestValidationError(`evidence "${item.id}" has an unparseable capturedAt ${JSON.stringify(item.capturedAt)}`)
    }
  }
  const claimIds = new Set<string>()
  for (const claim of request.claims) {
    if (claim.id.trim() === '') throw new RequestValidationError('claim id must be non-empty')
    if (claimIds.has(claim.id)) throw new RequestValidationError(`duplicate claim id "${claim.id}"`)
    claimIds.add(claim.id)
    for (const evidenceId of claim.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        throw new RequestValidationError(`claim "${claim.id}" binds unknown evidence id "${evidenceId}"`)
      }
    }
  }
  for (const [sectionIndex, section] of request.sections.entries()) {
    for (const [paragraphIndex, paragraph] of section.paragraphs.entries()) {
      for (const claimId of paragraph.claimIds ?? []) {
        if (!claimIds.has(claimId)) {
          throw new RequestValidationError(
            `sections[${sectionIndex}].paragraphs[${paragraphIndex}] cites unregistered claim id "${claimId}"`,
          )
        }
      }
    }
  }
}

/** Everything the renderers need: the validated request plus the outcomes. */
export interface ReportPlan {
  /** The validated request. */
  request: AssembleReportRequest
  /** Per-claim verdicts (claim registration order). */
  verdicts: ClaimVerdict[]
  /** The durable evidence records (hash + provenance). */
  evidence: EvidenceRecord[]
  /** ISO-8601 generation time. */
  generatedAt: string
  /** The config fingerprint. */
  fingerprint: string
  /** The generator version. */
  pluginVersion: string
  /** Claims whose verdict drifted from a prior verified state (re-audit). */
  driftCount: number
  /** Registration of `verification.jsonl`, when at least one claim was re-audited. */
  verification?: { file: string; sha256: string; entries: number }
  /** Registration of `disconfirmation.jsonl`, when at least one claim was contradicted. */
  disconfirmation?: { file: string; sha256: string; entries: number }
}

/** The status mark used in the appendix table. */
function statusMark(status: ClaimVerdict['status']): string {
  switch (status) {
    case 'verified': return '✅ verified'
    case 'insufficient': return '🔍 insufficient'
    case 'unverified': return '⚠️ unverified'
    case 'contradicted': return '❌ contradicted'
    case 'disproven': return '🚫 disproven'
  }
}

/** Escape a table cell. */
function cell(text: string): string {
  return text.replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ')
}

/**
 * Render `report.md`. Unverified/insufficient/contradicted claims keep a
 * visible body marker after every paragraph that cites them — nothing is
 * silently passed. The summary line carries the drift count and the four
 * verdict counts; Appendix D lists every contradicted claim.
 * @param plan - the validated request plus verdicts and evidence records.
 * @returns the report markdown.
 */
export function renderReportMarkdown(plan: ReportPlan): string {
  const verdictByClaim = new Map(plan.verdicts.map(verdict => [verdict.claimId, verdict]))
  const claimById = new Map(plan.request.claims.map(claim => [claim.id, claim]))
  const counts = { verified: 0, unverified: 0, contradicted: 0, insufficient: 0, disproven: 0 }
  for (const verdict of plan.verdicts) counts[verdict.status] += 1

  const lines: string[] = [
    `# ${plan.request.title}`,
    '',
    `- Topic: ${plan.request.topic}`,
    `- Generated: ${plan.generatedAt} (UTC)`,
    `- Claims: ${counts.verified} verified / ${counts.unverified} unverified / ${counts.contradicted} contradicted / ${counts.insufficient} insufficient / ${counts.disproven} disproven`,
    `- Drift: ${plan.driftCount} claim(s) drifted from a prior verified verdict`,
    `- Generator: dsh-research-report ${plan.pluginVersion}`,
    '',
  ]

  for (const section of plan.request.sections) {
    lines.push(`## ${section.heading}`, '')
    for (const paragraph of section.paragraphs) {
      const marks: string[] = []
      for (const claimId of paragraph.claimIds ?? []) {
        const verdict = verdictByClaim.get(claimId)
        if (verdict?.status === 'unverified') marks.push(UNVERIFIED_MARK)
        if (verdict?.status === 'insufficient') marks.push(INSUFFICIENT_MARK)
        if (verdict?.status === 'contradicted') marks.push(CONTRADICTED_MARK)
        if (verdict?.status === 'disproven') marks.push(DISPROVEN_MARK)
      }
      lines.push(marks.length === 0 ? paragraph.text : `${paragraph.text} ${marks.join(' ')}`, '')
    }
  }

  lines.push('## Appendix A: Claim verification', '')
  if (plan.verdicts.length === 0) {
    lines.push('No claims were registered.', '')
  } else {
    lines.push('| Claim | Verdict | Evidence | Note |', '|---|---|---|---|')
    for (const verdict of plan.verdicts) {
      const claim = claimById.get(verdict.claimId)
      lines.push(
        `| ${cell(verdict.claimId)} | ${statusMark(verdict.status)} | ${cell((claim?.evidenceIds ?? []).join(', '))} | ${cell(verdict.note ?? '')} |`,
      )
    }
    lines.push('')
  }

  lines.push('## Appendix B: Evidence list', '')
  if (plan.evidence.length === 0) {
    lines.push('No evidence was bound.', '')
  } else {
    lines.push('| Id | Title | Origin | SHA-256 | Captured | Session anchor |', '|---|---|---|---|---|---|')
    for (const record of plan.evidence) {
      const anchor = record.sessionRef === undefined
        ? ''
        : `session ${record.sessionRef.sessionId} [${record.sessionRef.eventRange.start}-${record.sessionRef.eventRange.end}]`
      lines.push(`| ${cell(record.id)} | ${cell(record.title)} | ${cell(record.origin)} | \`${record.hash}\` | ${record.capturedAt} | ${cell(anchor)} |`)
    }
    lines.push('')
  }

  lines.push(
    '## Appendix C: Seal',
    '',
    `- Manifest: \`manifest.json\` (schema ${MANIFEST_SCHEMA})`,
    `- Config fingerprint: \`${plan.fingerprint}\``,
    `- Generated: ${plan.generatedAt} (UTC)`,
    '',
  )

  lines.push('## Appendix D: Disconfirmation log (证伪记录)', '')
  const falsified = plan.verdicts.filter(verdict => verdict.status === 'contradicted' || verdict.status === 'disproven')
  if (falsified.length === 0) {
    lines.push('No claims were contradicted or disproven.', '')
  } else {
    lines.push('| Claim | Verdict | Evidence | Note |', '|---|---|---|---|')
    for (const verdict of falsified) {
      const claim = claimById.get(verdict.claimId)
      lines.push(`| ${cell(verdict.claimId)} | ${statusMark(verdict.status)} | ${cell((claim?.evidenceIds ?? []).join(', '))} | ${cell(verdict.note ?? '')} |`)
    }
    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

/** The durable manifest document (`manifest.json`). */
export interface ReportManifest {
  schema: typeof MANIFEST_SCHEMA
  title: string
  topic: string
  generatedAt: string
  generator: string
  reportFile: string
  reportSha256: string
  configFingerprint: string
  evidence: Array<{
    id: string
    sha256: string
    origin: string
    title: string
    capturedAt: string
    bytes: number
    sessionRef?: { sessionId: string; eventRange: { start: number; end: number } }
  }>
  claims: Array<{ id: string; text: string; evidenceIds: string[] }>
  verdicts: ClaimVerdict[]
  /** Claims whose verdict drifted from a prior verified state (re-audit). */
  driftCount: number
  /** `verification.jsonl` registration, present when the journal is non-empty. */
  verification?: { file: string; sha256: string; entries: number }
  /** `disconfirmation.jsonl` registration, present when the journal is non-empty. */
  disconfirmation?: { file: string; sha256: string; entries: number }
}

/** One line of `verification.jsonl` — the pre-delivery re-audit record. */
export interface VerificationEntry {
  /** The claim id. */
  claimId: string
  /** SHA-256 of the claim text (content address). */
  claimHash: string
  /** SHA-256 object addresses of the bound evidence snapshots. */
  evidenceHashes: string[]
  /** ISO-8601 re-audit time (the report generation time). */
  at: string
  /** The fresh re-audit verdict. */
  status: ClaimVerdict['status']
  /** The ledger's prior verdict status, or null when the claim was never verified. */
  priorStatus: ClaimVerdict['status'] | null
  /** True when a prior verified verdict drifted to a non-verified re-audit. */
  drifted: boolean
  /** Session-event anchors of the bound evidence, when any. */
  sessionRefs?: Array<{ evidenceId: string; sessionId: string; eventRange: { start: number; end: number } }>
}

/** One line of `disconfirmation.jsonl` — a falsified claim. */
export interface DisconfirmationEntry {
  /** The claim id. */
  claimId: string
  /** SHA-256 of the claim text (content address). */
  claimHash: string
  /** The bound evidence ids. */
  evidenceIds: string[]
  /** SHA-256 object addresses of the bound evidence snapshots. */
  evidenceHashes: string[]
  /** ISO-8601 record time (the report generation time). */
  at: string
  /** The falsification kind: contradicted (integrity/bridge) or disproven (content). */
  status: 'contradicted' | 'disproven'
  /** The contradiction reason (from the final verdict note). */
  note: string
}

/**
 * Build the manifest document for one sealed report. Key order is fixed by
 * construction so the serialized bytes (and therefore the seal hash) are
 * deterministic for the same inputs.
 * @param plan - the validated request plus verdicts and evidence records.
 * @param reportSha256 - the SHA-256 of the rendered report.md bytes.
 * @returns the manifest document.
 */
export function buildManifest(plan: ReportPlan, reportSha256: string): ReportManifest {
  return {
    schema: MANIFEST_SCHEMA,
    title: plan.request.title,
    topic: plan.request.topic,
    generatedAt: plan.generatedAt,
    generator: `dsh-research-report ${plan.pluginVersion}`,
    reportFile: 'report.md',
    reportSha256,
    configFingerprint: plan.fingerprint,
    evidence: plan.evidence.map(record => ({
      id: record.id,
      sha256: record.hash,
      origin: record.origin,
      title: record.title,
      capturedAt: record.capturedAt,
      bytes: record.bytes,
      ...(record.sessionRef === undefined ? {} : { sessionRef: record.sessionRef }),
    })),
    claims: plan.request.claims.map(claim => ({ id: claim.id, text: claim.text, evidenceIds: claim.evidenceIds })),
    verdicts: plan.verdicts,
    driftCount: plan.driftCount,
    ...(plan.verification === undefined ? {} : { verification: plan.verification }),
    ...(plan.disconfirmation === undefined ? {} : { disconfirmation: plan.disconfirmation }),
  }
}

/**
 * Serialize one manifest to its exact durable bytes. The seal hash is the
 * SHA-256 of this text.
 * @param manifest - the manifest document.
 * @returns the canonical manifest.json content.
 */
export function serializeManifest(manifest: ReportManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

/**
 * Serialize the pre-delivery re-audit journal (`verification.jsonl`). Field
 * order is fixed by construction, so the bytes (and the manifest seal that
 * covers them) are deterministic for the same inputs.
 * @param entries - the re-audit records in claim order.
 * @returns the canonical JSONL content.
 */
export function serializeVerificationJournal(entries: readonly VerificationEntry[]): string {
  return entries.map(entry => `${JSON.stringify(entry)}\n`).join('')
}

/**
 * Serialize the falsification journal (`disconfirmation.jsonl`). Field order
 * is fixed by construction, so the bytes (and the manifest seal that covers
 * them) are deterministic for the same inputs.
 * @param entries - the falsified-claim records in claim order.
 * @returns the canonical JSONL content.
 */
export function serializeDisconfirmationJournal(entries: readonly DisconfirmationEntry[]): string {
  return entries.map(entry => `${JSON.stringify(entry)}\n`).join('')
}
