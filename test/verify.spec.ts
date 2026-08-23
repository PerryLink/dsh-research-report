/**
 * Byte-level verification unit tests: citation extraction, the three verdict
 * states, the context-label contradiction check, and the numeric-bridge
 * mapping.
 * @module dsh-research-report/test/verify.spec
 */

import { describe, expect, it } from 'vitest'
import {
  combineOutcomes,
  contextLabelOf,
  extractCitations,
  mapBridgeResults,
  normalizeNumber,
  verifyClaimText,
} from '../src/verify.ts'

describe('extractCitations', () => {
  it('extracts numbers with their left-context labels', () => {
    const citations = extractCitations('2025 年全球示例行业市场规模达到 1,280 亿元')
    const number = citations.find(citation => citation.text === '1,280')
    expect(number).toBeDefined()
    expect(number?.kind).toBe('number')
    expect(number?.context).toContain('市场规模达到')
  })

  it('extracts quoted spans (ASCII and CJK quotes)', () => {
    const citations = extractCitations('报告称“示例行业已进入平台化整合阶段”，并提到 "platform consolidation"')
    expect(citations.some(citation => citation.kind === 'quote' && citation.text === '示例行业已进入平台化整合阶段')).toBe(true)
    expect(citations.some(citation => citation.kind === 'quote' && citation.text === 'platform consolidation')).toBe(true)
  })

  it('dedupes repeated literals', () => {
    const citations = extractCitations('增长 11.3%，再增长 11.3%')
    expect(citations.filter(citation => citation.text === '11.3%')).toHaveLength(1)
  })

  it('drops too-short context labels', () => {
    expect(contextLabelOf('是 5', 1)).toBeUndefined()
  })
})

describe('normalizeNumber', () => {
  it('strips grouping commas and the percent sign', () => {
    expect(normalizeNumber('1,280')).toBe('1280')
    expect(normalizeNumber('11.3%')).toBe('11.3')
  })
})

describe('verifyClaimText', () => {
  const evidence = ['2025 年全球示例行业市场规模达到 1,280 亿元，同比增长率为 11.3%。报告原文：“示例行业已进入平台化整合阶段”。']

  it('verifies a claim whose citations are all locatable', () => {
    const outcome = verifyClaimText('市场规模为 1,280 亿元，增长率为 11.3%，“示例行业已进入平台化整合阶段”。', evidence)
    expect(outcome.status).toBe('verified')
    expect(outcome.missing).toHaveLength(0)
  })

  it('marks a claim insufficient when a citation is absent from the snapshot', () => {
    const outcome = verifyClaimText('市场规模为 9,999 亿元', evidence)
    expect(outcome.status).toBe('insufficient')
    expect(outcome.missing).toContain('9,999')
    expect(outcome.note).toContain('insufficient evidence')
  })

  it('marks a claim disproven when the label context carries a different number', () => {
    const outcome = verifyClaimText('同比增长率为 25.0%', evidence)
    expect(outcome.status).toBe('disproven')
    expect(outcome.contradictions.length).toBeGreaterThan(0)
    expect(outcome.note).toContain('disproves the claim')
  })

  it('marks a claim with no checkable citation unverified', () => {
    const outcome = verifyClaimText('行业前景一片大好', evidence)
    expect(outcome.status).toBe('unverified')
    expect(outcome.note).toContain('no checkable citation')
  })

  it('marks a claim without bound evidence unverified', () => {
    const outcome = verifyClaimText('市场规模为 1,280 亿元', [])
    expect(outcome.status).toBe('unverified')
    expect(outcome.note).toContain('no evidence')
  })

  it('does not contradict when the same number follows the label', () => {
    const outcome = verifyClaimText('同比增长率为 11.3%', evidence)
    expect(outcome.status).toBe('verified')
  })
})

describe('mapBridgeResults', () => {
  it('maps mismatch to disproven with the actual value', () => {
    const mapped = mapBridgeResults({ results: [{ id: 'x', status: 'mismatch', actual: 42 }] })
    expect(mapped.status).toBe('disproven')
    expect(mapped.note).toContain('42')
  })

  it('maps not-found and unverifiable to unverified', () => {
    expect(mapBridgeResults({ results: [{ id: 'x', status: 'not-found' }] }).status).toBe('unverified')
    expect(mapBridgeResults({ results: [{ id: 'x', status: 'unverifiable', note: 'no path' }] }).status).toBe('unverified')
  })

  it('maps an all-verified set to verified', () => {
    expect(mapBridgeResults({ results: [{ id: 'x', status: 'verified' }] }).status).toBe('verified')
  })
})

describe('combineOutcomes', () => {
  const byte = { status: 'verified' as const, note: 'byte ok', missing: [], contradictions: [] }

  it('lets disproven win over verified', () => {
    expect(combineOutcomes(byte, { status: 'disproven', note: 'bridge' }).status).toBe('disproven')
  })

  it('lets the byte-level result stand when the bridge agrees', () => {
    expect(combineOutcomes(byte, { status: 'verified', note: 'bridge ok' }).status).toBe('verified')
    expect(combineOutcomes(byte, undefined).status).toBe('verified')
  })

  it('lets a byte-level contradiction win over a verified bridge', () => {
    const contra = { status: 'contradicted' as const, note: 'byte contra', missing: [], contradictions: ['x'] }
    expect(combineOutcomes(contra, { status: 'verified', note: 'bridge ok' }).status).toBe('contradicted')
  })

  it('lets a byte-level disproof win over a verified bridge', () => {
    const disproof = { status: 'disproven' as const, note: 'byte disproof', missing: [], contradictions: ['x'] }
    expect(combineOutcomes(disproof, { status: 'verified', note: 'bridge ok' }).status).toBe('disproven')
  })
})
