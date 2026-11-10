/**
 * research_trail: claim → evidence → verdict joining, unbound/dangling marks.
 * @module dsh-research-report/test/research-trail.spec
 */

import { describe, expect, it } from 'vitest'
import { buildTrail } from '../src/tools/research-trail.ts'
import type { ClaimView, EvidenceView, LedgerSummary } from '../src/service.ts'

const summary: LedgerSummary = { evidenceCount: 1, claimCount: 3, verdictCount: 1, tamperedCount: 0 }
const evidence: EvidenceView[] = [
  {
    id: 'ev-1',
    hash: 'a'.repeat(64),
    title: 'Pilot report',
    origin: 'https://example.org/a',
    capturedAt: '2026-11-10T00:00:00.000Z',
    bytes: 120,
    integrity: 'ok',
  },
]
const claims: ClaimView[] = [
  { id: 'c1', text: 'The pilot enrolled 24 participants.', evidenceIds: ['ev-1'], verdict: { claimId: 'c1', status: 'verified', at: '2026-11-10T00:00:00.000Z' } },
  { id: 'c2', text: 'No evidence was bound.', evidenceIds: [] },
  { id: 'c3', text: 'A dangling reference.', evidenceIds: ['ev-missing'] },
]

describe('buildTrail', () => {
  it('joins claims to evidence and marks unbound/dangling rows', () => {
    const trail = buildTrail({ summary, evidence, claims, now: new Date('2026-11-10T12:00:00.000Z') })
    expect(trail.ok).toBe(true)
    expect(trail.claims).toHaveLength(3)
    expect(trail.claims[0]).toMatchObject({ id: 'c1', verdict: 'verified', unbound: false })
    expect(trail.claims[0]?.evidence[0]).toMatchObject({ id: 'ev-1', integrity: 'ok' })
    expect(trail.claims[1]).toMatchObject({ id: 'c2', verdict: 'unverified', unbound: true })
    expect(trail.claims[2]?.unbound).toBe(true)
    expect(trail.unboundClaims).toEqual(['c2', 'c3'])
    expect(trail.missingEvidence).toEqual([{ claimId: 'c3', evidenceId: 'ev-missing' }])
    expect(trail.markdown).toContain('# Research trail')
    expect(trail.markdown).toContain('**[verified]** The pilot enrolled 24 participants.')
    expect(trail.markdown).toContain('**unbound**')
    expect(trail.markdown).toContain('Dangling evidence references')
  })

  it('caps claims at the limit and handles an empty ledger', () => {
    const limited = buildTrail({ summary, evidence, claims, now: new Date(), limit: 1 })
    expect(limited.claims).toHaveLength(1)
    const empty = buildTrail({
      summary: { evidenceCount: 0, claimCount: 0, verdictCount: 0, tamperedCount: 0 },
      evidence: [],
      claims: [],
      now: new Date(),
    })
    expect(empty.claims).toEqual([])
    expect(empty.markdown).toContain('_No claims registered yet._')
  })
})
