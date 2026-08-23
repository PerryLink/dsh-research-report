/**
 * Pre-delivery re-audit integration tests: the seal interception on hard
 * signals (tamper + drift), the explicit `insufficient` state end-to-end, the
 * `disproven` state + disconfirmation.jsonl falsification ledger, and the
 * negative-knowledge block (a disproven claim cannot be re-reported as
 * verified while its evidence is unchanged).
 * @module dsh-research-report/test/audit.spec
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'
import type { LedgerQueryValue } from '../src/tools/ledger-query.ts'
import type { ResearchReportValue } from '../src/tools/research-report.ts'
import type { ReportManifest } from '../src/assemble.ts'
import type { DataQualityBridge } from '../src/verify.ts'

const fibers: Array<{ dispose(): Promise<void> }> = []
const bases: BaseHarness[] = []
afterEach(async () => {
  await Promise.all(fibers.splice(0).map(fiber => fiber.dispose()))
  await Promise.all(bases.splice(0).map(base => unmountBase(base)))
})

/** Type-narrow a successful tool value. */
function valueOf<T>(result: { isError: boolean; value?: unknown }): T {
  if (result.isError) throw new Error('tool execution failed unexpectedly')
  return result.value as T
}

/** Mount a fresh base plus the plugin. */
async function setup(sessionId: string): Promise<BaseHarness> {
  const base = await mountBase(sessionId)
  bases.push(base)
  fibers.push(await mountPlugin(base))
  return base
}

/** Wrap a plain disposer function into the `{ dispose }` shape. */
function asDisposer(dispose: () => void): { dispose(): Promise<void> } {
  return { dispose: async () => { dispose() } }
}

/** Add one fixture and return its durable evidence id + content hash. */
async function addFixture(base: BaseHarness, origin: string, title: string): Promise<{ id: string; hash: string }> {
  const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin, title }))
  if (!added.ok) throw new Error(`fixture add failed: ${added.error.message}`)
  return { id: added.evidenceId, hash: added.hash }
}

/** Read + parse the manifest of a sealed report. */
async function readManifest(reportDir: string): Promise<ReportManifest> {
  return JSON.parse(await readFile(path.join(reportDir, 'manifest.json'), 'utf8')) as ReportManifest
}

/** A scripted dataQuality bridge: one real implementation of the bridge surface. */
function scriptedDataQuality(results: Array<{ id: string; status: 'verified' | 'mismatch' | 'not-found' | 'unverifiable'; actual?: number | string; note?: string }>): DataQualityBridge {
  return {
    async verifyCitations(request) {
      return { results: request.citations.map(citation => results.find(result => result.id === citation.id)!) }
    },
  }
}

describe('pre-delivery re-audit: seal interception on hard signals', () => {
  it('blocks sealing (fail loud) after tampering a previously-verified claim', async () => {
    const base = await setup('audit-drift')
    const { id } = await addFixture(base, 'fixtures/market-size.md', '市场规模快照')

    const args = {
      topic: '漂移检测',
      sections: [{ heading: '市场规模', paragraphs: [{ text: '2025 年市场规模为 1,280 亿元。', claimIds: ['c1'] }] }],
      claims: [{ id: 'c1', text: '市场规模为 1,280 亿元', evidenceIds: [id] }],
      evidenceRefs: [id],
    }
    const first = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(first.kind).toBe('sealed')
    if (first.kind !== 'sealed') return
    expect(first.driftCount).toBe(0)
    expect(first.counts).toEqual({ verified: 1, unverified: 0, contradicted: 0, insufficient: 0, disproven: 0 })

    // Tamper the snapshot object after the verified seal.
    const manifest = await readManifest(first.reportDir)
    const objectPath = path.join(base.root, 'ledger', 'objects', manifest.evidence[0]!.sha256)
    const original = await readFile(objectPath, 'utf8')
    await writeFile(objectPath, original.replace('1,280', '9,999'), 'utf8')

    // Re-assemble: the re-audit surfaces the tamper + drift hard signals and
    // blocks the seal, listing the concrete reasons.
    const blocked = await executeTool(base, 'research_report', args)
    expect(blocked.isError).toBe(true)
    const text = blocked.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('seal blocked')
    expect(text).toContain('verdict drift')
    expect(text).toContain('integrity failure')

    // The drift verdict is still recorded in the ledger (durable audit fact).
    const claim = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', { claimId: 'c1' }))
    expect(claim.kind).toBe('claim')
    if (claim.kind === 'claim') {
      expect(claim.claim.verdict?.status).toBe('contradicted')
      expect(claim.claim.verdict?.note).toContain('drift from prior verified verdict')
    }
  })
})

describe('explicit insufficient state', () => {
  it('verdicts a claim with bound-but-insufficient evidence as insufficient and renders the marker', async () => {
    const base = await setup('audit-insufficient')
    const { id } = await addFixture(base, 'fixtures/market-size.md', '市场规模快照')

    const args = {
      topic: '证据不足',
      sections: [{ heading: '市场规模', paragraphs: [{ text: '报告称“示例行业尚未实现盈利”。', claimIds: ['c1'] }] }],
      claims: [{ id: 'c1', text: '报告称“示例行业尚未实现盈利”', evidenceIds: [id] }],
      evidenceRefs: [id],
    }
    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    expect(sealed.counts).toEqual({ verified: 0, unverified: 0, contradicted: 0, insufficient: 1, disproven: 0 })
    const c1 = sealed.verdicts.find(verdict => verdict.claimId === 'c1')
    expect(c1?.status).toBe('insufficient')
    expect(c1?.note).toContain('insufficient evidence')

    const report = await readFile(sealed.reportFile, 'utf8')
    expect(report).toContain('[证据不足]')
    expect(report).toContain('🔍 insufficient')
    const manifest = await readManifest(sealed.reportDir)
    expect(manifest.verdicts.find(verdict => verdict.claimId === 'c1')?.status).toBe('insufficient')
  })
})

describe('disproven state + disconfirmation.jsonl', () => {
  it('writes a recomputable falsification journal with a disproven entry and renders [已证伪]', async () => {
    const base = await setup('audit-disconfirmation')
    const { id } = await addFixture(base, 'fixtures/growth.md', '增长率快照')

    const args = {
      topic: '证伪记录',
      sections: [{ heading: '增长率', paragraphs: [{ text: '2025 年同比增长率为 25.0%。', claimIds: ['c1'] }] }],
      claims: [{ id: 'c1', text: '同比增长率为 25.0%', evidenceIds: [id] }],
      evidenceRefs: [id],
    }
    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    const c1 = sealed.verdicts.find(verdict => verdict.claimId === 'c1')
    expect(c1?.status).toBe('disproven')

    const journalText = await readFile(path.join(sealed.reportDir, 'disconfirmation.jsonl'), 'utf8')
    const journalLine = JSON.parse(journalText.trim()) as { claimId: string; evidenceIds: string[]; status: string; note: string }
    expect(journalLine).toMatchObject({ claimId: 'c1', evidenceIds: [id], status: 'disproven' })
    expect(journalLine.note).toContain('disproves')

    const manifest = await readManifest(sealed.reportDir)
    expect(manifest.disconfirmation?.entries).toBe(1)
    expect(manifest.disconfirmation?.sha256).toBe(createHash('sha256').update(journalText, 'utf8').digest('hex'))
    const report = await readFile(sealed.reportFile, 'utf8')
    expect(report).toContain('## Appendix D: Disconfirmation log (证伪记录)')
    expect(report).toContain('🚫 disproven')
    expect(report).toContain('[已证伪]')
  })
})

describe('negative knowledge (disproofs.jsonl)', () => {
  it('blocks re-reporting a disproven claim as verified when the evidence is unchanged', async () => {
    const base = await mountBase('audit-neg-knowledge')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    // The bridge disproves the citation in the first report and is absent in
    // the second, so the byte-level check alone would re-verify the claim.
    fibers.push(asDisposer(base.ctx.provide('dataQuality', scriptedDataQuality([
      { id: 'c1', status: 'mismatch', actual: 11.3, note: 'dataset contradicts' },
    ]))))

    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'fixtures/growth.md', title: '增长率快照' }))
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const id = added.evidenceId

    const args1 = {
      topic: '负知识',
      sections: [{ heading: '增长率', paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c1'] }] }],
      claims: [{
        id: 'c1',
        text: '同比增长率为 11.3%',
        evidenceIds: [id],
        dataset: 'fixtures/growth.csv',
        citations: [{ id: 'c1', path: 'rows[3].nav', value: 11.3 }],
      }],
      evidenceRefs: [id],
    }
    const first = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args1))
    expect(first.kind).toBe('sealed')
    if (first.kind !== 'sealed') return
    expect(first.verdicts.find(verdict => verdict.claimId === 'c1')?.status).toBe('disproven')

    // Same claim text under a NEW claim id, same evidence, no dataset citation:
    // the byte check alone would say verified, but negative knowledge blocks it.
    const args2 = {
      topic: '负知识复报',
      sections: [{ heading: '增长率', paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c2'] }] }],
      claims: [{ id: 'c2', text: '同比增长率为 11.3%', evidenceIds: [id] }],
      evidenceRefs: [id],
    }
    const second = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args2))
    expect(second.kind).toBe('sealed')
    if (second.kind !== 'sealed') return
    const c2 = second.verdicts.find(verdict => verdict.claimId === 'c2')
    expect(c2?.status).toBe('disproven')
    expect(c2?.note).toContain('previously disproven against unchanged evidence')
  })

  it('allows re-verification after the bound evidence changes', async () => {
    const base = await setup('audit-evidence-change')
    const { id } = await addFixture(base, 'fixtures/growth.md', '增长率快照')

    // Disprove c1 against growth.md (the snapshot says 11.3%, the claim 25.0%).
    const args1 = {
      topic: '证伪',
      sections: [{ heading: '增长率', paragraphs: [{ text: '2025 年同比增长率为 25.0%。', claimIds: ['c1'] }] }],
      claims: [{ id: 'c1', text: '同比增长率为 25.0%', evidenceIds: [id] }],
      evidenceRefs: [id],
    }
    const first = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args1))
    expect(first.kind).toBe('sealed')
    if (first.kind !== 'sealed') return
    expect(first.verdicts.find(verdict => verdict.claimId === 'c1')?.status).toBe('disproven')

    // New evidence that actually supports the 25.0% claim (different content ⇒
    // different object hash ⇒ negative knowledge no longer applies).
    const added2 = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'inline:growth-25',
      content: '2025 年同比增长率为 25.0%。',
    }))
    expect(added2.ok).toBe(true)
    if (!added2.ok) return
    const id2 = added2.evidenceId

    const args2 = {
      topic: '证伪-新证据',
      sections: [{ heading: '增长率', paragraphs: [{ text: '2025 年同比增长率为 25.0%。', claimIds: ['c2'] }] }],
      claims: [{ id: 'c2', text: '同比增长率为 25.0%', evidenceIds: [id2] }],
      evidenceRefs: [id2],
    }
    const second = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args2))
    expect(second.kind).toBe('sealed')
    if (second.kind !== 'sealed') return
    const c2 = second.verdicts.find(verdict => verdict.claimId === 'c2')
    expect(c2?.status).toBe('verified')
  })
})
