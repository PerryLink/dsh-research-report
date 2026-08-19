/**
 * Assembly unit tests: request validation (loud rejects), report rendering
 * (visible markers), manifest construction, and seal determinism.
 * @module dsh-research-report/test/assemble.spec
 */

import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  CONTRADICTED_MARK,
  MANIFEST_SCHEMA,
  RequestValidationError,
  UNVERIFIED_MARK,
  buildManifest,
  configFingerprint,
  renderReportMarkdown,
  serializeManifest,
  slugify,
  validateAssembleRequest,
  versionIdOf,
} from '../src/assemble.ts'
import type { ReportPlan } from '../src/assemble.ts'
import type { AssembleReportRequest } from '../src/service.ts'

/** A minimal valid request factory. */
function requestOf(overrides: Partial<AssembleReportRequest> = {}): AssembleReportRequest {
  return {
    title: '示例行业概览',
    topic: '示例行业概览',
    evidence: [{
      id: 'ev-a',
      title: '市场规模快照',
      origin: 'fixtures/market-size.md',
      content: '2025 年全球示例行业市场规模达到 1,280 亿元。',
      capturedAt: '2026-08-19T00:00:00.000Z',
    }],
    sections: [{
      heading: '市场规模',
      paragraphs: [{ text: '市场规模为 1,280 亿元。', claimIds: ['c1'] }],
    }],
    claims: [{ id: 'c1', text: '市场规模为 1,280 亿元', evidenceIds: ['ev-a'] }],
    ...overrides,
  }
}

const LIMITS = { maxEvidenceBytes: 2 * 1024 * 1024, maxEvidencePerReport: 200 }

/** A plan factory over the valid request. */
function planOf(overrides: Partial<ReportPlan> = {}): ReportPlan {
  const request = requestOf()
  return {
    request,
    verdicts: [{ claimId: 'c1', status: 'verified', note: '1 citation(s) located verbatim' }],
    evidence: [{
      id: 'ev-a',
      hash: createHash('sha256').update(request.evidence[0]!.content, 'utf8').digest('hex'),
      title: '市场规模快照',
      origin: 'fixtures/market-size.md',
      capturedAt: '2026-08-19T00:00:00.000Z',
      bytes: Buffer.byteLength(request.evidence[0]!.content, 'utf8'),
    }],
    generatedAt: '2026-08-19T01:02:03.000Z',
    fingerprint: configFingerprint(LIMITS),
    pluginVersion: '0.1.0',
    ...overrides,
  }
}

describe('validateAssembleRequest', () => {
  it('accepts the valid request', () => {
    expect(() => validateAssembleRequest(requestOf(), LIMITS)).not.toThrow()
  })

  it('rejects a section citing an unregistered claim (loud)', () => {
    const request = requestOf()
    request.sections[0]!.paragraphs[0]!.claimIds = ['c-unknown']
    expect(() => validateAssembleRequest(request, LIMITS)).toThrow(RequestValidationError)
    expect(() => validateAssembleRequest(request, LIMITS)).toThrow(/unregistered claim id/u)
  })

  it('rejects a claim binding unknown evidence (loud)', () => {
    const request = requestOf()
    request.claims[0]!.evidenceIds = ['ev-missing']
    expect(() => validateAssembleRequest(request, LIMITS)).toThrow(/unknown evidence id/u)
  })

  it('rejects empty title/topic/sections and duplicate ids', () => {
    expect(() => validateAssembleRequest(requestOf({ title: ' ' }), LIMITS)).toThrow(/title/u)
    expect(() => validateAssembleRequest(requestOf({ topic: '' }), LIMITS)).toThrow(/topic/u)
    expect(() => validateAssembleRequest(requestOf({ sections: [] }), LIMITS)).toThrow(/at least one section/u)
    const duplicated = requestOf()
    duplicated.claims.push({ id: 'c1', text: 'other', evidenceIds: ['ev-a'] })
    expect(() => validateAssembleRequest(duplicated, LIMITS)).toThrow(/duplicate claim id/u)
  })

  it('enforces the evidence caps', () => {
    const big = requestOf()
    big.evidence[0]!.content = 'x'.repeat(11)
    expect(() => validateAssembleRequest(big, { ...LIMITS, maxEvidenceBytes: 10 })).toThrow(/maxEvidenceBytes/u)
    const many = requestOf()
    expect(() => validateAssembleRequest(many, { ...LIMITS, maxEvidencePerReport: 0 })).toThrow(/maxEvidencePerReport/u)
  })

  it('rejects an unparseable capturedAt', () => {
    const bad = requestOf()
    bad.evidence[0]!.capturedAt = 'not-a-date'
    expect(() => validateAssembleRequest(bad, LIMITS)).toThrow(/capturedAt/u)
  })
})

describe('renderReportMarkdown', () => {
  it('renders the appendix verification table and evidence list', () => {
    const text = renderReportMarkdown(planOf())
    expect(text).toContain('# 示例行业概览')
    expect(text).toContain('## Appendix A: Claim verification')
    expect(text).toContain('✅ verified')
    expect(text).toContain('## Appendix B: Evidence list')
    expect(text).toContain('fixtures/market-size.md')
    expect(text).not.toContain(UNVERIFIED_MARK)
  })

  it('keeps visible body markers for unverified and contradicted claims', () => {
    const plan = planOf({
      verdicts: [{ claimId: 'c1', status: 'unverified', note: 'not found' }],
    })
    expect(renderReportMarkdown(plan)).toContain(`市场规模为 1,280 亿元。 ${UNVERIFIED_MARK}`)
    const contradicted = planOf({
      verdicts: [{ claimId: 'c1', status: 'contradicted', note: 'snapshot says otherwise' }],
    })
    expect(renderReportMarkdown(contradicted)).toContain(CONTRADICTED_MARK)
    expect(renderReportMarkdown(contradicted)).toContain('❌ contradicted')
  })
})

describe('manifest + seal', () => {
  it('builds a manifest whose serialized bytes recompute to the same hash', () => {
    const plan = planOf()
    const reportText = renderReportMarkdown(plan)
    const reportSha256 = createHash('sha256').update(reportText, 'utf8').digest('hex')
    const manifest = buildManifest(plan, reportSha256)
    expect(manifest.schema).toBe(MANIFEST_SCHEMA)
    expect(manifest.reportSha256).toBe(reportSha256)
    expect(manifest.evidence[0]?.id).toBe('ev-a')
    const text = serializeManifest(manifest)
    const sealA = createHash('sha256').update(text, 'utf8').digest('hex')
    const sealB = createHash('sha256').update(serializeManifest(buildManifest(planOf(), reportSha256)), 'utf8').digest('hex')
    expect(sealA).toBe(sealB)
  })
})

describe('slugify / versionIdOf / configFingerprint', () => {
  it('slugs topics to filesystem-safe ids (CJK kept)', () => {
    expect(slugify('示例行业概览')).toBe('示例行业概览')
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026')
    expect(slugify('   ')).toBe('report')
  })

  it('formats the version id as YYYYMMDD-HHmmss (UTC)', () => {
    expect(versionIdOf(new Date('2026-08-19T01:02:03.000Z'))).toBe('20260819-010203')
  })

  it('fingerprints the policy knobs', () => {
    expect(configFingerprint(LIMITS)).toMatch(/^[0-9a-f]{16}$/u)
    expect(configFingerprint({ ...LIMITS, maxEvidencePerReport: 100 })).not.toBe(configFingerprint(LIMITS))
  })
})
