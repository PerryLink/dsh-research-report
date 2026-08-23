/**
 * Plugin assembly tests over the REAL host seams (SessionStore, SystemPrompt,
 * ToolRuntime, LocalJobRegistry): service + tool registration, the
 * evidence_add paths (inline / file / URL without web), the full
 * research_report seal flow, ledger_query, and the background job branch.
 * @module dsh-research-report/test/index.spec
 */

import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { JobId } from '@deepseek-ai/dsh-jobs'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'
import type { LedgerQueryValue } from '../src/tools/ledger-query.ts'
import type { ResearchReportValue } from '../src/tools/research-report.ts'

const fibers: Array<{ dispose(): Promise<void> }> = []
const bases: BaseHarness[] = []
afterEach(async () => {
  await Promise.all(fibers.splice(0).map(fiber => fiber.dispose()))
  await Promise.all(bases.splice(0).map(base => unmountBase(base)))
})

/** Mount a fresh base plus the plugin. */
async function setup(sessionId: string): Promise<BaseHarness> {
  const base = await mountBase(sessionId)
  bases.push(base)
  fibers.push(await mountPlugin(base))
  return base
}

/** Type-narrow a successful tool value. */
function valueOf<T>(result: { isError: boolean; value?: unknown }): T {
  if (result.isError) throw new Error('tool execution failed unexpectedly')
  return result.value as T
}

describe('apply', () => {
  it('registers the service and all three tools', async () => {
    const base = await setup('index-register')
    expect(base.ctx.get('researchReport')).toBeDefined()
    for (const tool of ['evidence_add', 'research_report', 'ledger_query']) {
      expect(base.ctx.tools.get(tool)).toBeDefined()
    }
  })

  it('stays inert when disabled', async () => {
    const base = await mountBase('index-disabled')
    bases.push(base)
    fibers.push(await mountPlugin(base, { enabled: false }))
    expect(base.ctx.get('researchReport')).toBeUndefined()
    expect(base.ctx.tools.get('evidence_add')).toBeUndefined()
  })

  it('unregisters the service and all three tools on dispose (reversible registration)', async () => {
    const base = await mountBase('index-dispose')
    bases.push(base)
    const fiber = await mountPlugin(base)
    expect(base.ctx.get('researchReport')).toBeDefined()
    expect(base.ctx.tools.get('evidence_add')).toBeDefined()

    await fiber.dispose()

    expect(base.ctx.get('researchReport')).toBeUndefined()
    expect(base.ctx.tools.get('evidence_add')).toBeUndefined()
    expect(base.ctx.tools.get('research_report')).toBeUndefined()
    expect(base.ctx.tools.get('ledger_query')).toBeUndefined()
  })
})

describe('evidence_add', () => {
  it('registers inline content (content-addressed, deduplicating)', async () => {
    const base = await setup('index-inline')
    const args = { origin: 'inline:note', content: '2025 年市场规模 1,280 亿元', title: '笔记' }
    const first = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', args))
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.evidenceId).toMatch(/^ev-[0-9a-f]{12}$/u)
    expect(first.deduplicated).toBe(false)
    const second = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', args))
    expect(second.ok && second.deduplicated).toBe(true)
  })

  it('captures a workspace file snapshot (fixture)', async () => {
    const base = await setup('index-file')
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'fixtures/market-size.md',
      title: '市场规模快照',
    }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/u)
    expect(result.bytes).toBeGreaterThan(0)
  })

  it('fails loud when a URL origin needs the absent web capability', async () => {
    const base = await setup('index-url-no-web')
    const result = await executeTool(base, 'evidence_add', { origin: 'https://example.com/report' })
    expect(result.isError).toBe(true)
    const text = result.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('WEB_UNAVAILABLE')
  })

  it('reports an unreadable workspace path as a domain failure (not a throw)', async () => {
    const base = await setup('index-missing-file')
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'fixtures/nope.md' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('ORIGIN_UNREADABLE')
  })

  it('refuses a path escaping the workspace', async () => {
    const base = await setup('index-escape')
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: '../../../outside.md' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('ORIGIN_OUTSIDE_WORKSPACE')
  })

  it('refuses over-size content', async () => {
    const base = await mountBase('index-oversize')
    bases.push(base)
    fibers.push(await mountPlugin(base, { maxEvidenceBytes: 16 }))
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'inline:big',
      content: 'x'.repeat(64),
    }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('EVIDENCE_TOO_LARGE')
  })
})

describe('research_report + ledger_query', () => {
  /** Add the three fixture docs as evidence; returns their ids. */
  async function addFixtures(base: BaseHarness): Promise<string[]> {
    const ids: string[] = []
    for (const [origin, title] of [
      ['fixtures/market-size.md', '市场规模快照'],
      ['fixtures/growth.md', '增长率快照'],
      ['fixtures/players.md', '厂商快照'],
    ] as const) {
      const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin, title }))
      if (!added.ok) throw new Error(`fixture add failed: ${added.error.message}`)
      ids.push(added.evidenceId)
    }
    return ids
  }

  /** The standard valid report args over the fixture evidence. */
  function reportArgs(ids: string[]): Record<string, unknown> {
    return {
      topic: '示例行业概览',
      sections: [{
        heading: '市场规模',
        paragraphs: [{ text: '2025 年全球示例行业市场规模为 1,280 亿元。', claimIds: ['c1'] }],
      }],
      claims: [{ id: 'c1', text: '市场规模为 1,280 亿元', evidenceIds: [ids[0]] }],
      evidenceRefs: ids,
    }
  }

  it('seals a report end-to-end through the real tool runtime', async () => {
    const base = await setup('index-seal')
    const ids = await addFixtures(base)
    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', reportArgs(ids)))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    expect(sealed.sealHash).toMatch(/^[0-9a-f]{64}$/u)
    expect(sealed.counts).toEqual({ verified: 1, unverified: 0, contradicted: 0 })
    expect(sealed.evidenceCount).toBe(3)
    // The sealed directory holds both files; the manifest recomputes the seal.
    const manifest = JSON.parse(await readFile(sealed.manifestFile, 'utf8')) as { verdicts: Array<{ status: string }> }
    expect(manifest.verdicts[0]?.status).toBe('verified')
    const report = await readFile(sealed.reportFile, 'utf8')
    expect(report).toContain('# Research report: 示例行业概览')
    expect(report).toContain('## Appendix A: Claim verification')
  })

  it('rejects loudly when a section cites an unregistered claim', async () => {
    const base = await setup('index-bad-claim')
    const ids = await addFixtures(base)
    const args = reportArgs(ids)
    ;(args.sections as Array<{ paragraphs: Array<{ claimIds: string[] }> }>)[0]!.paragraphs[0]!.claimIds = ['c-nope']
    const result = await executeTool(base, 'research_report', args)
    expect(result.isError).toBe(true)
    const text = result.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('unregistered claim id')
  })

  it('rejects loudly when evidenceRefs names an unknown id', async () => {
    const base = await setup('index-bad-ref')
    const ids = await addFixtures(base)
    const args = reportArgs(ids)
    args.evidenceRefs = [...ids, 'ev-doesnotexist']
    const result = await executeTool(base, 'research_report', args)
    expect(result.isError).toBe(true)
    const text = result.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('unknown evidence id')
  })

  it('answers ledger_query for evidence, claims, and the summary', async () => {
    const base = await setup('index-query')
    const ids = await addFixtures(base)
    await executeTool(base, 'research_report', reportArgs(ids))

    const evidence = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', { evidenceId: ids[0] }))
    expect(evidence.kind).toBe('evidence')
    if (evidence.kind === 'evidence') expect(evidence.evidence.integrity).toBe('ok')

    const claim = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', { claimId: 'c1' }))
    expect(claim.kind).toBe('claim')
    if (claim.kind === 'claim') expect(claim.claim.verdict?.status).toBe('verified')

    const summary = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', {}))
    expect(summary.kind).toBe('summary')
    if (summary.kind === 'summary') {
      expect(summary.evidenceCount).toBe(3)
      expect(summary.claimCount).toBe(1)
      expect(summary.verdictCount).toBe(1)
    }

    const missing = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', { evidenceId: 'ev-nope' }))
    expect(missing.kind).toBe('not-found')
  })

  it('runs the assemble as a background job over the real ctx.jobs', async () => {
    const base = await setup('index-background')
    const ids = await addFixtures(base)
    const args = reportArgs(ids)
    args.background = true
    const started = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args, { agent: false }))
    expect(started.kind).toBe('background')
    if (started.kind !== 'background') return
    expect(started.jobId).toMatch(/^research-report-\d+$/u)
    const jobId = JobId(started.jobId)
    const snapshot = await base.ctx.jobs.wait(jobId, 10_000)
    expect(snapshot.status).toBe('completed')
    const read = base.ctx.jobs.read(jobId)
    expect(read.text).toContain('report sealed:')
  })

  it('returns the gathered branch without assembling when gather is set (no web → loud)', async () => {
    const base = await setup('index-gather-no-web')
    const result = await executeTool(base, 'research_report', { topic: '示例行业', gather: true })
    expect(result.isError).toBe(true)
    const text = result.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('WEB_UNAVAILABLE')
  })
})
