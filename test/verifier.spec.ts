/**
 * Read-only verifier loop tests: the deterministic `verifySealedReport`
 * fallback (recompute the seal hash + re-check every claim), the machine-check
 * note written at seal time, and the with-jobs / without-jobs paths for the
 * optional model-review job.
 * @module dsh-research-report/test/verifier.spec
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { LocalResearchReportService } from '../src/provider-local.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'
import type { ResearchReportValue } from '../src/tools/research-report.ts'

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

/** Add one fixture and seal a one-claim report over it. */
async function sealReport(base: BaseHarness): Promise<{ reportDir: string; sealHash: string }> {
  const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'fixtures/market-size.md', title: '市场规模快照' }))
  if (!added.ok) throw new Error(`fixture add failed: ${added.error.message}`)
  const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', {
    topic: '验证回环',
    sections: [{ heading: '市场规模', paragraphs: [{ text: '2025 年市场规模为 1,280 亿元。', claimIds: ['c1'] }] }],
    claims: [{ id: 'c1', text: '市场规模为 1,280 亿元', evidenceIds: [added.evidenceId] }],
    evidenceRefs: [added.evidenceId],
  }))
  if (sealed.kind !== 'sealed') throw new Error('report did not seal')
  return { reportDir: sealed.reportDir, sealHash: sealed.sealHash }
}

describe('verifySealedReport (deterministic fallback)', () => {
  it('recomputes the seal hash and re-checks every claim', async () => {
    const base = await mountBase('verifier-fallback')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir, sealHash } = await sealReport(base)

    const service = base.ctx.get('researchReport') as LocalResearchReportService
    const result = await service.verifySealedReport(reportDir, sealHash)
    expect(result.ok).toBe(true)
    expect(result.sealHashMatches).toBe(true)
    expect(result.sealHash).toBe(sealHash)
    expect(result.reportHashMatches).toBe(true)
    expect(result.journalHashesMatch).toBe(true)
    expect(result.gapSectionPresent).toBe(true)
    expect(result.disproofSectionPresent).toBe(true)
    expect(result.claimChecks).toHaveLength(1)
    expect(result.claimChecks[0]).toMatchObject({ claimId: 'c1', recorded: 'verified', recomputed: 'verified', match: true })
  })

  it('detects a tampered manifest (seal hash mismatch)', async () => {
    const base = await mountBase('verifier-tamper')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir, sealHash } = await sealReport(base)

    // A sealed report whose manifest is rewritten fails the seal-hash recompute.
    await import('node:fs/promises').then(fs => fs.writeFile(path.join(reportDir, 'manifest.json'), '{"tampered":true}\n', 'utf8'))
    const service = base.ctx.get('researchReport') as LocalResearchReportService
    const result = await service.verifySealedReport(reportDir, sealHash)
    expect(result.ok).toBe(false)
    expect(result.sealHashMatches).toBe(false)
  })
})

describe('verifier note (with jobs)', () => {
  it('writes the machine-check section and starts the read-only verifier job', async () => {
    const base = await mountBase('verifier-jobs')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir } = await sealReport(base)

    const note = await readFile(path.join(reportDir, 'verifier-note.md'), 'utf8')
    expect(note).toContain('## Machine check (deterministic)')
    expect(note).toContain('Overall: OK')
    expect(note).toContain('## Model review (read-only)')
    expect(note).toContain('read-only verifier job')
    expect(note).not.toContain('skipped')
  })
})

describe('verifier note (no jobs)', () => {
  it('skips the model review gracefully and records the status', async () => {
    const base = await mountBase('verifier-no-jobs', { jobs: false })
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir } = await sealReport(base)

    const note = await readFile(path.join(reportDir, 'verifier-note.md'), 'utf8')
    expect(note).toContain('## Machine check (deterministic)')
    expect(note).toContain('Overall: OK')
    expect(note).toContain('## Model review (read-only)')
    expect(note).toContain('verifier: skipped (jobs unavailable)')
    expect(note).not.toContain('read-only verifier job')
  })
})
