/**
 * Standalone verifier output formats (JSON envelope + SARIF 2.1.0) over a real
 * sealed report: the seal-hash recompute feeds the envelope, SARIF renders the
 * failed checks as results, and a missing expected seal renders a note instead
 * of a false mismatch.
 * @module dsh-research-report/test/verifier-cli.spec
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { LocalResearchReportService } from '../src/provider-local.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'
import type { ResearchReportValue } from '../src/tools/research-report.ts'
import { buildVerificationReport, renderSarif, renderVerificationJson } from '../src/verify-sealed.ts'
import { sha256Of } from '../src/ledger.ts'

const fibers: Array<{ dispose(): Promise<void> }> = []
const bases: BaseHarness[] = []
afterEach(async () => {
  await Promise.all(fibers.splice(0).map(fiber => fiber.dispose()))
  await Promise.all(bases.splice(0).map(base => unmountBase(base)))
})

function valueOf<T>(result: { isError: boolean; value?: unknown }): T {
  if (result.isError) throw new Error('tool execution failed unexpectedly')
  return result.value as T
}

async function sealReport(base: BaseHarness): Promise<{ reportDir: string; sealHash: string }> {
  const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'fixtures/market-size.md', title: '市场规模快照' }))
  if (!added.ok) throw new Error(`fixture add failed: ${added.error.message}`)
  const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', {
    topic: '验证回环-cli',
    sections: [{ heading: '市场规模', paragraphs: [{ text: '2025 年市场规模为 1,280 亿元。', claimIds: ['c1'] }] }],
    claims: [{ id: 'c1', text: '市场规模为 1,280 亿元', evidenceIds: [added.evidenceId] }],
    evidenceRefs: [added.evidenceId],
  }))
  if (sealed.kind !== 'sealed') throw new Error('report did not seal')
  return { reportDir: sealed.reportDir, sealHash: sealed.sealHash }
}

/** The recomputed seal hash of one report directory (the "self-seal" for the no-expected-seal case). */
async function recomputedSeal(reportDir: string): Promise<string> {
  return sha256Of(await readFile(path.join(reportDir, 'manifest.json'), 'utf8'))
}

describe('buildVerificationReport', () => {
  it('wraps a clean verification into a JSON envelope', async () => {
    const base = await mountBase('verifier-cli-json')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir, sealHash } = await sealReport(base)

    const service = base.ctx.get('researchReport') as LocalResearchReportService
    const result = await service.verifySealedReport(reportDir, sealHash)
    const report = buildVerificationReport(result, reportDir, sealHash, 'rechecked')
    expect(report.tool).toBe('dsh-research-report-verify')
    expect(report.schema).toBe('dsh-research-report/verification@v1')
    expect(report.sealHashMatches).toBe(true)
    expect(report.claimsChecked).toBe(1)
    expect(report.claimsMatched).toBe(1)
    expect(report.ok).toBe(true)
    const json = JSON.parse(renderVerificationJson(report)) as { ok: boolean; claimChecks: unknown[] }
    expect(json.ok).toBe(true)
    expect(json.claimChecks).toHaveLength(1)
  })

  it('reports a null seal comparison when no expected seal is supplied', async () => {
    const base = await mountBase('verifier-cli-noseal')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir } = await sealReport(base)

    const service = base.ctx.get('researchReport') as LocalResearchReportService
    const result = await service.verifySealedReport(reportDir, await recomputedSeal(reportDir))
    const report = buildVerificationReport(result, reportDir, null)
    expect(report.sealHashMatches).toBeNull()
    expect(report.ok).toBe(true) // internal hashes still all match
  })
})

describe('renderSarif', () => {
  it('renders a SARIF 2.1.0 document with no results for a clean report', async () => {
    const base = await mountBase('verifier-cli-sarif')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir, sealHash } = await sealReport(base)

    const service = base.ctx.get('researchReport') as LocalResearchReportService
    const result = await service.verifySealedReport(reportDir, sealHash)
    const report = buildVerificationReport(result, reportDir, sealHash)
    const sarif = JSON.parse(renderSarif(report)) as {
      version: string
      runs: Array<{ tool: { driver: { name: string } }; results: Array<{ ruleId: string }> }>
    }
    expect(sarif.version).toBe('2.1.0')
    expect(sarif.runs[0]!.tool.driver.name).toBe('dsh-research-report-verify')
    expect(sarif.runs[0]!.results).toEqual([])
  })

  it('emits a note when the expected seal is omitted', async () => {
    const base = await mountBase('verifier-cli-sarif-noseal')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const { reportDir } = await sealReport(base)

    const service = base.ctx.get('researchReport') as LocalResearchReportService
    const result = await service.verifySealedReport(reportDir, await recomputedSeal(reportDir))
    const report = buildVerificationReport(result, reportDir, null)
    const sarif = JSON.parse(renderSarif(report)) as {
      runs: Array<{ results: Array<{ ruleId: string; level: string }> }>
    }
    expect(sarif.runs[0]!.results.some(entry => entry.ruleId === 'seal-hash-not-compared')).toBe(true)
  })
})
