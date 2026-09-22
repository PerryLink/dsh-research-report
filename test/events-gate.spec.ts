/**
 * The adaptive audit gate, pinned as a regression lock (exec card step 4).
 *
 * `research-report/*` events are appended only when the host's own vocabulary
 * knows them: on the shipped host lines the persistence layer refuses a log
 * carrying an unknown non-marked type, so an unconditional append would make
 * the session unresumable. The three assertions below are the anti-hand-slip
 * lock the card asks for — the size assertion in particular is *meant* to go
 * red when the upstream vocabulary changes.
 * @module dsh-research-report/test/events-gate.spec
 */

import { afterEach, describe, expect, it } from 'vitest'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'

/** Every event type this plugin can mirror into the session log. */
const OWN_EVENT_TYPES = ['research-report/evidence', 'research-report/verify', 'research-report/seal'] as const

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

describe('adaptive audit gate (regression lock)', () => {
  it('pins the host vocabulary size', () => {
    // 58 is the size of KNOWN_SESSION_EVENT_TYPES at *runtime*: this test file
    // resolves `@deepseek-ai/dsh-session` from node_modules, i.e. the installed
    // 0.1.6-alpha.2 peer. It is NOT the checkout's vocabulary — the 0.1.7-alpha.1
    // checkout declares 60 (it adds `developer/message`; `workspace/changes` is
    // already in alpha.2), so a peer-pin bump moves this number and this test is
    // meant to be re-snapshotted then.
    // A red here is the wanted signal: the upstream vocabulary moved, so
    // re-snapshot the set and re-check the two assertions below before
    // touching this number.
    expect(KNOWN_SESSION_EVENT_TYPES.size).toBe(58)
  })

  it('keeps every research-report/* type outside the host vocabulary', () => {
    for (const type of OWN_EVENT_TYPES) {
      expect(KNOWN_SESSION_EVENT_TYPES.has(type)).toBe(false)
    }
  })

  it('never appends an audit event on a host that does not know the vocabulary', async () => {
    const base = await mountBase('research-report-gate')
    bases.push(base)
    fibers.push(await mountPlugin(base))

    const before = base.session.snapshotEvents()
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'fixtures/market-size.md',
      title: '市场规模快照',
    }))
    expect(added.ok).toBe(true)

    // The evidence landed in the ledger (the durable source of truth) while
    // the session log gained nothing: appendAudit must call its append thunk
    // exactly zero times on this host.
    const after = base.session.snapshotEvents()
    expect(after.filter(event => event.type.startsWith('research-report/'))).toHaveLength(0)
    expect(after.length).toBe(before.length)
  })
})
