/**
 * The optional `ctx.dataQuality` bridge, end to end: a scripted service is
 * provided on the REAL Context (the plugin only ever calls `ctx.get`), and a
 * claim carrying `dataset` + `citations` must consume its outcome during
 * assemble — mismatch verdicts land as `contradicted` in the sealed report.
 * @module dsh-research-report/test/data-quality-bridge.spec
 */

import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'
import type { ResearchReportValue } from '../src/tools/research-report.ts'
import type { CitationCheckRequest, DataQualityBridge } from '../src/verify.ts'

const disposers: Array<{ dispose(): unknown }> = []
const bases: BaseHarness[] = []
afterEach(async () => {
  await Promise.all(disposers.splice(0).map(disposer => disposer.dispose()))
  await Promise.all(bases.splice(0).map(base => unmountBase(base)))
})

/** Wrap a plain disposer function into the `{ dispose }` shape. */
function asDisposer(dispose: () => void): { dispose(): unknown } {
  return { dispose: () => dispose() }
}

function valueOf<T>(result: { isError: boolean; value?: unknown }): T {
  if (result.isError) throw new Error('tool execution failed unexpectedly')
  return result.value as T
}

/** A scripted dataQuality service: one real implementation of the bridge surface. */
function scriptedDataQuality(results: Array<{ id: string; status: 'verified' | 'mismatch' | 'not-found' | 'unverifiable'; actual?: number | string; note?: string }>): DataQualityBridge {
  return {
    async verifyCitations(request) {
      return { results: request.citations.map(citation => results.find(result => result.id === citation.id)!) }
    },
  }
}

describe('dataQuality bridge integration (optional ctx.get seam)', () => {
  it('consumes a mounted bridge and reports a numeric mismatch as contradicted', async () => {
    const base = await mountBase('bridge')
    bases.push(base)
    disposers.push(await mountPlugin(base))
    // A scripted bridge mounted on the same Context the plugin reads from.
    disposers.push(asDisposer(base.ctx.provide('dataQuality', scriptedDataQuality([
      { id: 'c1', status: 'mismatch', actual: 9.7, note: 'dataset row 3.nav is 9.7, claim cites 11.3' },
      { id: 'c2', status: 'verified', actual: 57, note: 'dataset row 5.share is 57' },
    ]))))

    const fixtures: Array<[string, string]> = [
      ['fixtures/growth.md', '增长率快照'],
      ['fixtures/players.md', '厂商快照'],
    ]
    const ids: string[] = []
    for (const [origin, title] of fixtures) {
      const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin, title }))
      expect(added.ok).toBe(true)
      if (added.ok) ids.push(added.evidenceId)
    }
    expect(ids).toHaveLength(2)

    const args = {
      topic: '桥接验证',
      title: '桥接验证（数据质量）',
      sections: [
        {
          heading: '增长率',
          paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c1'] }],
        },
        {
          heading: '份额',
          paragraphs: [{ text: '头部三家厂商合计占比 57%。', claimIds: ['c2'] }],
        },
      ],
      claims: [
        {
          id: 'c1',
          text: '同比增长率为 11.3%',
          evidenceIds: [ids[0]!],
          dataset: 'fixtures/growth.csv',
          citations: [{ id: 'c1', path: 'rows[3].nav', value: 11.3 }],
        },
        {
          id: 'c2',
          text: '前三厂商合计占比为 57%',
          evidenceIds: [ids[1]!],
          dataset: 'fixtures/players.csv',
          citations: [{ id: 'c2', path: 'rows[5].share', value: 57 }],
        },
      ],
      evidenceRefs: ids,
    }

    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    // c1 is contradicted by the bridge mismatch; c2 is verified by the bridge
    // (byte-level check on the local fixture also passes).
    expect(sealed.counts).toEqual({ verified: 1, unverified: 0, contradicted: 1 })
    const c1 = sealed.verdicts.find(verdict => verdict.claimId === 'c1')
    expect(c1?.status).toBe('contradicted')
    expect(c1?.note).toContain('dataset row 3.nav is 9.7')
    const report = await readFile(sealed.reportFile, 'utf8')
    expect(report).toContain('[与证据矛盾]')
  })

  it('notes the absence of the bridge (claim declares dataset citations, verdict conservatively unverified)', async () => {
    const base = await mountBase('bridge-absent')
    bases.push(base)
    disposers.push(await mountPlugin(base))

    const fixture = ['fixtures/growth.md', '增长率快照'] as const
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: fixture[0], title: fixture[1] }))
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const id = added.evidenceId

    const args = {
      topic: '无桥接',
      title: '无桥接（数据质量）',
      sections: [
        {
          heading: '增长率',
          paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c1'] }],
        },
      ],
      claims: [
        {
          id: 'c1',
          text: '同比增长率为 11.3%',
          evidenceIds: [id],
          dataset: 'fixtures/growth.csv',
          citations: [{ id: 'c1', path: 'rows[3].nav', value: 11.3 }],
        },
      ],
      evidenceRefs: [id],
    }

    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    expect(sealed.counts).toEqual({ verified: 0, unverified: 1, contradicted: 0 })
    const c1 = sealed.verdicts.find(verdict => verdict.claimId === 'c1')
    expect(c1?.status).toBe('unverified')
    expect(c1?.note).toContain('ctx.dataQuality is not mounted')
  })

  it('survives a bridge that throws (unverified, never crashes assemble)', async () => {
    const base = await mountBase('bridge-throw')
    bases.push(base)
    disposers.push(await mountPlugin(base))
    disposers.push(asDisposer(base.ctx.provide('dataQuality', {
      async verifyCitations() {
        throw new Error('provider exploded')
      },
    })))

    const fixture = ['fixtures/growth.md', '增长率快照'] as const
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: fixture[0], title: fixture[1] }))
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const id = added.evidenceId

    const args = {
      topic: '桥接异常',
      title: '桥接异常（数据质量）',
      sections: [
        {
          heading: '增长率',
          paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c1'] }],
        },
      ],
      claims: [
        {
          id: 'c1',
          text: '同比增长率为 11.3%',
          evidenceIds: [id],
          dataset: 'fixtures/growth.csv',
          citations: [{ id: 'c1', path: 'rows[3].nav', value: 11.3 }],
        },
      ],
      evidenceRefs: [id],
    }

    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    expect(sealed.counts).toEqual({ verified: 0, unverified: 1, contradicted: 0 })
    const c1 = sealed.verdicts.find(verdict => verdict.claimId === 'c1')
    expect(c1?.status).toBe('unverified')
    expect(c1?.note).toContain('numeric dataset bridge failed: provider exploded')
  })

  it('passes the frozen CitationCheckRequest across the ctx.get boundary', async () => {
    const base = await mountBase('bridge-request')
    bases.push(base)
    disposers.push(await mountPlugin(base))
    // Capture the exact request the plugin hands the bridge: it must carry the
    // frozen CitationCheckRequest field set (dataset + citations[id/path/value/
    // tolerance]), byte-stable with the real dsh-data-quality service.
    let captured: CitationCheckRequest | undefined
    const bridge: DataQualityBridge = {
      async verifyCitations(request: CitationCheckRequest) {
        captured = request
        return { results: request.citations.map(citation => ({ id: citation.id, status: 'verified' as const, actual: citation.value })) }
      },
    }
    disposers.push(asDisposer(base.ctx.provide('dataQuality', bridge)))

    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'fixtures/growth.md', title: '增长率快照' }))
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const id = added.evidenceId

    const args = {
      topic: '契约边界',
      title: '契约边界（数据质量）',
      sections: [{ heading: '增长率', paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c1'] }] }],
      claims: [{
        id: 'c1',
        text: '同比增长率为 11.3%',
        evidenceIds: [id],
        dataset: 'fixtures/growth.csv',
        citations: [{ id: 'c1', path: 'rows[3].nav', value: 11.3, tolerance: 0.01 }],
      }],
      evidenceRefs: [id],
    }

    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    expect(sealed.verdicts.find(verdict => verdict.claimId === 'c1')?.status).toBe('verified')
    expect(captured?.dataset).toBe('fixtures/growth.csv')
    expect(captured?.citations[0]).toMatchObject({ id: 'c1', path: 'rows[3].nav', value: 11.3, tolerance: 0.01 })
  })
})