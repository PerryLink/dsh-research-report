/**
 * Keyless end-to-end acceptance flow: three local fixture documents become
 * evidence; a report assembles and seals; the appendix verification table is
 * complete; then one evidence object is deliberately tampered with and the
 * re-run verification path reports `contradicted`.
 * @module dsh-research-report/test/e2e.spec
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'
import type { LedgerQueryValue } from '../src/tools/ledger-query.ts'
import type { ResearchReportValue } from '../src/tools/research-report.ts'
import type { ReportManifest } from '../src/assemble.ts'

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

describe('keyless end-to-end: fixtures → seal → tamper → contradicted', () => {
  it('runs the complete acceptance flow', async () => {
    const base = await mountBase('e2e')
    bases.push(base)
    fibers.push(await mountPlugin(base))

    // 1. Register the three fixture documents as evidence (workspace-relative origins).
    const fixtures: Array<[string, string]> = [
      ['fixtures/market-size.md', '市场规模快照'],
      ['fixtures/growth.md', '增长率快照'],
      ['fixtures/players.md', '厂商快照'],
    ]
    const ids: string[] = []
    for (const [origin, title] of fixtures) {
      const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin, title }))
      expect(added.ok).toBe(true)
      if (added.ok) ids.push(added.evidenceId)
    }
    expect(ids).toHaveLength(3)

    // 2. Assemble the sealed report over the topic 示例行业概览.
    const args = {
      topic: '示例行业概览',
      title: '示例行业概览（验收）',
      sections: [
        {
          heading: '市场规模',
          paragraphs: [{ text: '2025 年全球示例行业市场规模为 1,280 亿元。', claimIds: ['c-size'] }],
        },
        {
          heading: '增长率',
          paragraphs: [{ text: '2025 年同比增长率为 11.3%。', claimIds: ['c-growth'] }],
        },
        {
          heading: '竞争格局',
          paragraphs: [{ text: '头部三家厂商合计占比 57%。', claimIds: ['c-share'] }],
        },
      ],
      claims: [
        { id: 'c-size', text: '市场规模为 1,280 亿元', evidenceIds: [ids[0]!] },
        { id: 'c-growth', text: '同比增长率为 11.3%', evidenceIds: [ids[1]!] },
        { id: 'c-share', text: '前三厂商合计占比为 57%', evidenceIds: [ids[2]!] },
      ],
      evidenceRefs: ids,
    }
    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return
    expect(sealed.counts).toEqual({ verified: 3, unverified: 0, contradicted: 0 })

    // 3. The versioned sealed directory: <reportRoot>/<slug>/<YYYYMMDD-HHmmss>/.
    expect(path.basename(path.dirname(sealed.reportDir))).toBe('示例行业概览')
    expect(path.basename(sealed.reportDir)).toMatch(/^\d{8}-\d{6}(-\d+)?$/u)

    // 4. The appendix verification table is complete and the manifest recomputes the seal.
    const report = await readFile(sealed.reportFile, 'utf8')
    for (const claimId of ['c-size', 'c-growth', 'c-share']) {
      expect(report).toContain(`| ${claimId} | ✅ verified |`)
    }
    expect(report).not.toContain('[未核实]')
    const manifestText = await readFile(sealed.manifestFile, 'utf8')
    const manifest = JSON.parse(manifestText) as ReportManifest
    expect(manifest.evidence).toHaveLength(3)
    expect(manifest.verdicts).toHaveLength(3)
    const { createHash } = await import('node:crypto')
    expect(createHash('sha256').update(manifestText, 'utf8').digest('hex')).toBe(sealed.sealHash)

    // 5. Tamper with one evidence object: rewrite the stored bytes.
    const tampered = manifest.evidence[1]!
    const objectPath = path.join(base.root, 'ledger', 'objects', tampered.sha256)
    const original = await readFile(objectPath, 'utf8')
    await writeFile(objectPath, original.replace('11.3%', '25.0%'), 'utf8')

    // 6a. ledger_query reports the tamper through the live integrity re-check.
    const queried = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', { evidenceId: ids[1]! }))
    expect(queried.kind).toBe('evidence')
    if (queried.kind === 'evidence') expect(queried.evidence.integrity).toBe('tampered')

    // 6b. Re-running the assemble path must verdict the bound claim contradicted.
    const resealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', args))
    expect(resealed.kind).toBe('sealed')
    if (resealed.kind !== 'sealed') return
    const growthVerdict = resealed.verdicts.find(verdict => verdict.claimId === 'c-growth')
    expect(growthVerdict?.status).toBe('contradicted')
    expect(growthVerdict?.note).toContain('integrity')
    // The marker is visible in the re-sealed body, and the summary query counts the failure.
    const resealedReport = await readFile(resealed.reportFile, 'utf8')
    expect(resealedReport).toContain('[与证据矛盾]')
    const summary = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', {}))
    expect(summary.kind).toBe('summary')
    if (summary.kind === 'summary') expect(summary.tamperedCount).toBe(1)
  })
})
