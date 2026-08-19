/**
 * The `ledger_query` model tool (Consumer): read-only queries over the
 * evidence ledger — bindings, verdicts, and the live integrity re-check.
 * @module dsh-research-report/tools/ledger-query
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { LocalResearchReportService } from '../provider-local.ts'
import type { ClaimView, EvidenceView } from '../service.ts'

/** The evidence branch of the canonical value. */
interface EvidenceBranch {
  kind: 'evidence'
  evidence: EvidenceView
}

/** The claim branch of the canonical value. */
interface ClaimBranch {
  kind: 'claim'
  claim: ClaimView
}

/** The summary branch (no id given). */
interface SummaryBranch {
  kind: 'summary'
  evidenceCount: number
  claimCount: number
  verdictCount: number
  tamperedCount: number
  evidenceIds: string[]
  claimIds: string[]
}

/** The not-found branch (unknown id — query semantics, not an error). */
interface NotFoundBranch {
  kind: 'not-found'
  message: string
}

/** The `ledger_query` canonical value. */
export type LedgerQueryValue = EvidenceBranch | ClaimBranch | SummaryBranch | NotFoundBranch

/** The evidence view schema fragment. */
const evidenceViewSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    hash: { type: 'string', required: true },
    title: { type: 'string', required: true },
    origin: { type: 'string', required: true },
    capturedAt: { type: 'string', required: true },
    bytes: { type: 'integer', required: true },
    integrity: { type: 'string', required: true, enum: ['ok', 'tampered', 'missing'] },
  },
} as const

/** The claim view schema fragment. */
const claimViewSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    text: { type: 'string', required: true },
    evidenceIds: { type: 'array', required: true, items: { type: 'string' } },
    dataset: { type: 'string' },
    verdict: {
      type: 'object',
      additionalProperties: false,
      properties: {
        claimId: { type: 'string', required: true },
        status: { type: 'string', required: true, enum: ['verified', 'unverified', 'contradicted'] },
        note: { type: 'string' },
        at: { type: 'string', required: true },
      },
    },
  },
} as const

/** The tool's output schema (all four branches). */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', required: true, enum: ['evidence', 'claim', 'summary', 'not-found'] },
    evidence: evidenceViewSchema,
    claim: claimViewSchema,
    evidenceCount: { type: 'integer' },
    claimCount: { type: 'integer' },
    verdictCount: { type: 'integer' },
    tamperedCount: { type: 'integer' },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    claimIds: { type: 'array', items: { type: 'string' } },
    message: { type: 'string' },
  },
} as const

/** Render the canonical value as model-facing text. */
function renderValue(value: LedgerQueryValue): { type: 'text'; text: string }[] {
  switch (value.kind) {
    case 'evidence': {
      const item = value.evidence
      const lines = [
        `evidence ${item.id}${item.integrity === 'ok' ? '' : ` — INTEGRITY ${item.integrity.toUpperCase()}`}`,
        `  title: ${item.title}`,
        `  origin: ${item.origin}`,
        `  sha256: ${item.hash}`,
        `  captured: ${item.capturedAt} (${item.bytes} bytes)`,
      ]
      if (item.integrity !== 'ok') {
        lines.push(`  WARNING: the stored bytes no longer match the indexed hash — any claim bound to this evidence verifies as contradicted`)
      }
      return [{ type: 'text', text: lines.join('\n') }]
    }
    case 'claim': {
      const claim = value.claim
      const lines = [
        `claim ${claim.id}`,
        `  text: ${claim.text}`,
        `  evidence: ${claim.evidenceIds.join(', ') || '(none)'}`,
      ]
      if (claim.dataset !== undefined) lines.push(`  dataset: ${claim.dataset}`)
      if (claim.verdict === undefined) {
        lines.push('  verdict: (never verified)')
      } else {
        lines.push(`  verdict: ${claim.verdict.status} at ${claim.verdict.at}${claim.verdict.note === undefined ? '' : ` — ${claim.verdict.note}`}`)
      }
      return [{ type: 'text', text: lines.join('\n') }]
    }
    case 'summary':
      return [{
        type: 'text',
        text: [
          `ledger summary: ${value.evidenceCount} evidence, ${value.claimCount} claims, ${value.verdictCount} verdicts, ${value.tamperedCount} integrity failures`,
          `evidence ids: ${value.evidenceIds.join(', ') || '(none)'}`,
          `claim ids: ${value.claimIds.join(', ') || '(none)'}`,
        ].join('\n'),
      }]
    case 'not-found':
      return [{ type: 'text', text: value.message }]
  }
}

/**
 * Build the `ledger_query` tool bound to the local provider.
 * @param service - the local research-report provider.
 * @returns the tool definition.
 */
export function makeLedgerQueryTool(service: LocalResearchReportService) {
  return defineTool({
    name: 'ledger_query',
    description: [
      'Read-only query over the verifiable research ledger (dsh-research-report): claim ↔ evidence bindings and verification verdicts.',
      'Pass claimId or evidenceId for one entry (evidence is re-hashed on read — integrity tampered/missing is reported explicitly), or neither for a ledger summary.',
    ].join('\n'),
    parameters: {
      claimId: { type: 'string', description: 'Query one claim: its bindings and latest verdict.' },
      evidenceId: { type: 'string', description: 'Query one evidence item: provenance, hash, live integrity.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => renderValue(value as LedgerQueryValue),
    },
    async execute(args, exec): Promise<LedgerQueryValue> {
      exec.signal.throwIfAborted()
      if (args.claimId !== undefined) {
        const claim = await service.getClaim(args.claimId)
        return claim === undefined
          ? { kind: 'not-found', message: `no claim "${args.claimId}" in the ledger` }
          : { kind: 'claim', claim }
      }
      if (args.evidenceId !== undefined) {
        const evidence = await service.getEvidence(args.evidenceId)
        return evidence === undefined
          ? { kind: 'not-found', message: `no evidence "${args.evidenceId}" in the ledger` }
          : { kind: 'evidence', evidence }
      }
      const [summary, evidence, claims] = await Promise.all([
        service.summarize(),
        service.listEvidence(),
        service.listClaims(),
      ])
      return {
        kind: 'summary',
        ...summary,
        evidenceIds: evidence.map(item => item.id),
        claimIds: claims.map(claim => claim.id),
      }
    },
  })
}
