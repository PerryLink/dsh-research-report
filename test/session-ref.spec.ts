/**
 * sessionRef evidence-anchor tests: format validation (positive/negative),
 * ledger + manifest + verification.jsonl registration, Appendix B rendering,
 * and the honest `unverified` verdict for session-anchored evidence.
 * @module dsh-research-report/test/session-ref.spec
 */

import { readFile } from 'node:fs/promises'
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

async function setup(sessionId: string): Promise<BaseHarness> {
  const base = await mountBase(sessionId)
  bases.push(base)
  fibers.push(await mountPlugin(base))
  return base
}

describe('sessionRef format validation', () => {
  it('registers a valid sessionRef and stores the anchor metadata', async () => {
    const base = await setup('session-ref-valid')
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'inline:session-note',
      content: '会话中的事实陈述',
      sessionRef: { sessionId: 'sess-1', eventRange: { start: 3, end: 7 } },
    }))
    expect(added.ok).toBe(true)
    if (!added.ok) return

    const queried = valueOf<LedgerQueryValue>(await executeTool(base, 'ledger_query', { evidenceId: added.evidenceId }))
    expect(queried.kind).toBe('evidence')
    if (queried.kind === 'evidence') {
      expect(queried.evidence.sessionRef).toEqual({ sessionId: 'sess-1', eventRange: { start: 3, end: 7 } })
    }
  })

  it('fails loud (INVALID_SESSION_REF) for a malformed anchor', async () => {
    const base = await setup('session-ref-invalid')
    const cases: Array<Record<string, unknown>> = [
      { sessionId: '  ', eventRange: { start: 1, end: 2 } },
      { sessionId: 'sess-1', eventRange: { start: 5, end: 2 } },
      { sessionId: 'sess-1', eventRange: { start: -1, end: 2 } },
    ]
    for (const sessionRef of cases) {
      const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
        origin: 'inline:session-bad',
        content: '事实陈述',
        sessionRef,
      }))
      expect(added.ok, `expected invalid sessionRef: ${JSON.stringify(sessionRef)}`).toBe(false)
      if (!added.ok) expect(added.error.code).toBe('INVALID_SESSION_REF')
    }
  })
})

describe('sessionRef rendering + honest unverified verdict', () => {
  it('renders the anchor, registers it in the manifest + verification.jsonl, and verdicts unverified', async () => {
    const base = await setup('session-ref-report')
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'inline:session-note',
      content: '2025 年市场规模为 1,280 亿元',
      sessionRef: { sessionId: 'sess-9', eventRange: { start: 10, end: 20 } },
    }))
    expect(added.ok).toBe(true)
    if (!added.ok) return

    const sealed = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', {
      topic: '会话锚点',
      sections: [{ heading: '市场规模', paragraphs: [{ text: '2025 年市场规模为 1,280 亿元。', claimIds: ['c1'] }] }],
      claims: [{ id: 'c1', text: '市场规模为 1,280 亿元', evidenceIds: [added.evidenceId] }],
      evidenceRefs: [added.evidenceId],
    }))
    expect(sealed.kind).toBe('sealed')
    if (sealed.kind !== 'sealed') return

    // The verdict is honestly unverified (session-anchored, not byte-verified).
    const c1 = sealed.verdicts.find(verdict => verdict.claimId === 'c1')
    expect(c1?.status).toBe('unverified')
    expect(c1?.note).toContain('会话锚定证据需人工回查会话日志')

    // The report appendix renders the anchor reference.
    const report = await readFile(sealed.reportFile, 'utf8')
    expect(report).toContain('| Session anchor |')
    expect(report).toContain('session sess-9 [10-20]')

    // The manifest registers the sessionRef metadata on the evidence entry.
    const manifest = JSON.parse(await readFile(sealed.manifestFile, 'utf8')) as ReportManifest
    expect(manifest.evidence[0]?.sessionRef).toEqual({ sessionId: 'sess-9', eventRange: { start: 10, end: 20 } })

    // verification.jsonl registers the sessionRefs of the bound evidence.
    const verificationText = await readFile(path.join(sealed.reportDir, 'verification.jsonl'), 'utf8')
    const line = JSON.parse(verificationText.trim()) as { sessionRefs: Array<{ evidenceId: string; sessionId: string }> }
    expect(line.sessionRefs).toEqual([{ evidenceId: added.evidenceId, sessionId: 'sess-9', eventRange: { start: 10, end: 20 } }])
  })
})
