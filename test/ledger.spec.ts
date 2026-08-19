/**
 * Evidence-ledger unit tests: content addressing, dedupe, id conflicts,
 * tamper detection (the audit-critical path), missing objects, and corrupt
 * journals. Pure Node — no DSH services involved.
 * @module dsh-research-report/test/ledger.spec
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EvidenceLedger, LedgerError, sha256Of } from '../src/ledger.ts'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

/** Create a ledger on a fresh temp root. */
async function freshLedger(): Promise<{ ledger: EvidenceLedger; root: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'rr-ledger-'))
  roots.push(root)
  return { ledger: new EvidenceLedger(path.join(root, 'ledger')), root }
}

const SAMPLE = {
  title: '示例文档',
  origin: 'fixtures/market-size.md',
  content: '2025 年全球示例行业市场规模达到 1,280 亿元。',
  capturedAt: '2026-08-19T00:00:00.000Z',
}

describe('EvidenceLedger', () => {
  it('stores snapshots content-addressed and derives ev-<hash12> ids', async () => {
    const { ledger } = await freshLedger()
    const outcome = await ledger.putEvidence(SAMPLE)
    const hash = sha256Of(SAMPLE.content)
    expect(outcome.created).toBe(true)
    expect(outcome.record.id).toBe(`ev-${hash.slice(0, 12)}`)
    expect(outcome.record.hash).toBe(hash)
    expect(outcome.record.bytes).toBe(Buffer.byteLength(SAMPLE.content, 'utf8'))
    // The object file holds the verbatim bytes.
    const { root } = await freshLedger()
    void root
    const stored = await ledger.readContent(outcome.record.id)
    expect(stored).toEqual({ content: SAMPLE.content, integrity: 'ok' })
  })

  it('deduplicates identical content on re-add (idempotent)', async () => {
    const { ledger } = await freshLedger()
    const first = await ledger.putEvidence(SAMPLE)
    const second = await ledger.putEvidence(SAMPLE)
    expect(second.created).toBe(false)
    expect(second.record.id).toBe(first.record.id)
    expect(await ledger.listEvidence()).toHaveLength(1)
  })

  it('refuses an id reuse with different content (history is immutable)', async () => {
    const { ledger } = await freshLedger()
    await ledger.putEvidence({ ...SAMPLE, id: 'doc-1' })
    await expect(ledger.putEvidence({ ...SAMPLE, id: 'doc-1', content: 'different bytes' }))
      .rejects.toThrow(LedgerError)
    await expect(ledger.putEvidence({ ...SAMPLE, id: 'doc-1', content: 'different bytes' }))
      .rejects.toThrow(/immutable/u)
  })

  it('detects tampering: rewriting the object file flips integrity to tampered', async () => {
    const { ledger } = await freshLedger()
    const { record } = await ledger.putEvidence(SAMPLE)
    const objectPath = path.join(ledger.root, 'objects', record.hash)
    await writeFile(objectPath, 'tampered bytes', 'utf8')
    const read = await ledger.readContent(record.id)
    expect(read?.integrity).toBe('tampered')
    expect(read?.content).toBe('tampered bytes')
  })

  it('degrades a deleted object to integrity missing (never throws)', async () => {
    const { ledger, root } = await freshLedger()
    const { record } = await ledger.putEvidence(SAMPLE)
    await rm(path.join(root, 'ledger', 'objects', record.hash))
    const read = await ledger.readContent(record.id)
    expect(read?.integrity).toBe('missing')
  })

  it('registers claims idempotently and rejects silent rewrites', async () => {
    const { ledger } = await freshLedger()
    const claim = { id: 'c1', text: '规模为 1,280 亿元', evidenceIds: ['ev-1'] }
    const at = '2026-08-19T00:00:00.000Z'
    await ledger.registerClaims([claim], at)
    const again = await ledger.registerClaims([claim], at)
    expect(again).toHaveLength(1)
    await expect(ledger.registerClaims([{ ...claim, text: '改写后的结论' }], at)).rejects.toThrow(/immutable/u)
    expect(await ledger.getClaim('c1')).toMatchObject({ id: 'c1', evidenceIds: ['ev-1'] })
  })

  it('folds verdicts latest-wins', async () => {
    const { ledger } = await freshLedger()
    await ledger.recordVerdict({ claimId: 'c1', status: 'unverified', note: 'first' }, '2026-08-19T00:00:00.000Z')
    await ledger.recordVerdict({ claimId: 'c1', status: 'verified' }, '2026-08-19T00:01:00.000Z')
    const latest = await ledger.latestVerdicts()
    expect(latest.get('c1')?.status).toBe('verified')
    expect(latest.get('c1')?.note).toBeUndefined()
  })

  it('fails loud on a corrupt journal line', async () => {
    const { ledger } = await freshLedger()
    await ledger.putEvidence(SAMPLE)
    await writeFile(path.join(ledger.root, 'index.jsonl'), '{"id": broken\n', 'utf8')
    await expect(ledger.listEvidence()).rejects.toThrow(/corrupt JSONL/u)
  })

  it('returns undefined for unknown ids', async () => {
    const { ledger } = await freshLedger()
    expect(await ledger.getEvidence('nope')).toBeUndefined()
    expect(await ledger.getClaim('nope')).toBeUndefined()
    expect(await ledger.readContent('nope')).toBeUndefined()
  })

  it('keeps raw bytes readable from the object store', async () => {
    const { ledger } = await freshLedger()
    const { record } = await ledger.putEvidence(SAMPLE)
    const raw = await readFile(path.join(ledger.root, 'objects', record.hash), 'utf8')
    expect(raw).toBe(SAMPLE.content)
  })
})
