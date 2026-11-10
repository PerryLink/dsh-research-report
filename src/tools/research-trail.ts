/**
 * The `research_trail` model tool (Consumer): a read-only claim → evidence →
 * verdict trail over the local ledger, rendered for a reviewer.
 *
 * It adds no storage and changes no ledger entry: it joins what
 * `evidence_add`/`research_report` already wrote, marks unbound claims and
 * dangling evidence explicitly, and leaves verdicts exactly as stored.
 *
 * @module dsh-research-report/tools/research-trail
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { LocalResearchReportService } from '../provider-local.ts'
import type { ClaimView, EvidenceView, LedgerSummary } from '../service.ts'

/** One evidence row in the trail. */
export interface TrailEvidence {
  readonly id: string
  readonly title: string
  readonly origin: string
  readonly integrity: string
  readonly bytes: number
}

/** One claim row in the trail. */
export interface TrailClaim {
  readonly id: string
  readonly text: string
  readonly verdict: string
  readonly note?: string
  readonly evidence: readonly TrailEvidence[]
  /** True when the claim has no evidence refs (or none of them resolve). */
  readonly unbound: boolean
}

/** The `research_trail` canonical value. */
export interface ResearchTrailValue {
  readonly ok: true
  readonly generatedAt: string
  readonly summary: LedgerSummary
  readonly claims: readonly TrailClaim[]
  readonly evidence: readonly TrailEvidence[]
  /** Claim → evidence ids that are not in the ledger. */
  readonly missingEvidence: readonly { readonly claimId: string; readonly evidenceId: string }[]
  readonly unboundClaims: readonly string[]
  readonly markdown: string
}

/** Build the trail from the service views (pure; exported for tests). */
export function buildTrail(input: {
  summary: LedgerSummary
  evidence: readonly EvidenceView[]
  claims: readonly ClaimView[]
  now: Date
  limit?: number
}): ResearchTrailValue {
  const limit = Math.max(1, Math.min(input.limit ?? 100, 500))
  const evidenceRows: TrailEvidence[] = input.evidence.map(item => ({
    id: item.id,
    title: item.title,
    origin: item.origin,
    integrity: item.integrity,
    bytes: item.bytes,
  }))
  const byId = new Map(evidenceRows.map(row => [row.id, row]))
  const missingEvidence: Array<{ claimId: string; evidenceId: string }> = []
  const unboundClaims: string[] = []
  const claims: TrailClaim[] = input.claims.slice(0, limit).map(claim => {
    const bound: TrailEvidence[] = []
    for (const evidenceId of claim.evidenceIds) {
      const row = byId.get(evidenceId)
      if (row === undefined) {
        missingEvidence.push({ claimId: claim.id, evidenceId })
        continue
      }
      bound.push(row)
    }
    const unbound = bound.length === 0
    if (unbound) unboundClaims.push(claim.id)
    return {
      id: claim.id,
      text: claim.text,
      verdict: claim.verdict?.status ?? 'unverified',
      ...(claim.verdict?.note === undefined ? {} : { note: claim.verdict.note }),
      evidence: bound,
      unbound,
    }
  })

  const lines: string[] = [
    '# Research trail',
    '',
    `Generated: ${input.now.toISOString()}`,
    '',
    `Evidence: ${input.summary.evidenceCount} · Claims: ${input.summary.claimCount} · Verdicts: ${input.summary.verdictCount} · Tampered: ${input.summary.tamperedCount}`,
    '',
    '## Claims',
    '',
  ]
  if (claims.length === 0) lines.push('_No claims registered yet._', '')
  claims.forEach((claim, index) => {
    lines.push(`${index + 1}. **[${claim.verdict}]** ${claim.text}`)
    if (claim.note !== undefined) lines.push(`   note: ${claim.note}`)
    if (claim.evidence.length === 0) {
      lines.push('   evidence: **unbound** — no resolvable evidence id', '')
      return
    }
    for (const item of claim.evidence) {
      lines.push(`   evidence: \`${item.id}\` (${item.integrity}, ${item.bytes} B) — ${item.title}`)
    }
    lines.push('')
  })
  if (missingEvidence.length > 0) {
    lines.push('## Dangling evidence references', '')
    for (const item of missingEvidence) lines.push(`- claim \`${item.claimId}\` → \`${item.evidenceId}\` (not in the ledger)`)
    lines.push('')
  }
  if (unboundClaims.length > 0) {
    lines.push('## Unbound claims', '', ...unboundClaims.map(id => `- \`${id}\``), '')
  }

  return {
    ok: true,
    generatedAt: input.now.toISOString(),
    summary: input.summary,
    claims,
    evidence: evidenceRows,
    missingEvidence,
    unboundClaims,
    markdown: lines.join('\n').trimEnd() + '\n',
  }
}

const ERROR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', required: true },
    message: { type: 'string', required: true },
  },
} as const

/**
 * Build the `research_trail` tool.
 * @param service - the local research-report service.
 * @returns the tool definition.
 */
export function makeResearchTrailTool(service: LocalResearchReportService) {
  return defineTool({
    name: 'research_trail',
    description: [
      'Render the claim → evidence → verdict trail of the local research ledger (dsh-research-report).',
      '',
      'Read-only: joins registered claims with their evidence and stored verdicts, marks claims with no resolvable evidence as unbound, and lists dangling evidence ids. Returns Markdown for a reviewer plus the structured rows. It adds no storage and never changes a verdict.',
    ].join('\n'),
    parameters: {
      limit: { type: 'integer', description: 'Maximum claims to include (1–500, default 100).' },
      format: { type: 'string', description: 'markdown (default) or json (renderer only; the value always carries both).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          generatedAt: { type: 'string' },
          summary: { type: 'json' },
          claims: { type: 'json' },
          evidence: { type: 'json' },
          missingEvidence: { type: 'json' },
          unboundClaims: { type: 'array', items: { type: 'string' } },
          markdown: { type: 'string' },
          error: ERROR_SCHEMA,
        },
      },
      render: (args, value) => {
        const format = (args as { format?: string }).format ?? 'markdown'
        const result = value as ResearchTrailValue | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `research_trail failed (${result.error.code}): ${result.error.message}` }]
        if (format === 'json') {
          const { markdown: _markdown, ...rest } = result
          void _markdown
          return [{ type: 'text', text: JSON.stringify(rest, null, 2) }]
        }
        return [{ type: 'text', text: result.markdown }]
      },
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted()
      try {
        const [summary, evidence, claims] = await Promise.all([
          service.summarize(),
          service.listEvidence(),
          service.listClaims(),
        ])
        const trail = buildTrail({
          summary,
          evidence,
          claims,
          now: new Date(),
          ...(args.limit === undefined ? {} : { limit: args.limit }),
        })
        return JSON.parse(JSON.stringify(trail)) as never
      } catch (error) {
        return {
          ok: false as const,
          error: { code: 'TRAIL_FAILED', message: error instanceof Error ? error.message : String(error) },
        }
      }
    },
  })
}
