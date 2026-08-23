/**
 * Config unit tests: explicit defaults and fail-loud bounds.
 * @module dsh-research-report/test/config.spec
 */

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'

describe('resolveConfig', () => {
  it('fills the documented defaults', () => {
    const resolved = resolveConfig({})
    expect(resolved.enabled).toBe(true)
    expect(resolved.ledgerRoot).toBe(path.resolve('.research-ledger'))
    expect(resolved.reportRoot).toBe(path.resolve('research-reports'))
    expect(resolved.maxEvidenceBytes).toBe(2 * 1024 * 1024)
    expect(resolved.maxEvidencePerReport).toBe(200)
    expect(resolved.fetchTimeoutMs).toBe(20_000)
    expect(resolved.requireJournalMetadata).toBe(false)
  })

  it('resolves relative roots against the working directory and keeps absolute ones', () => {
    const resolved = resolveConfig({ ledgerRoot: 'x/y', reportRoot: '/tmp/rr' })
    expect(resolved.ledgerRoot).toBe(path.resolve('x/y'))
    expect(resolved.reportRoot).toBe(path.resolve('/tmp/rr'))
  })

  it('fails loud on invalid bounds', () => {
    expect(() => resolveConfig({ maxEvidenceBytes: 0 })).toThrow(/maxEvidenceBytes/u)
    expect(() => resolveConfig({ maxEvidencePerReport: -1 })).toThrow(/maxEvidencePerReport/u)
    expect(() => resolveConfig({ fetchTimeoutMs: 1.5 })).toThrow(/fetchTimeoutMs/u)
    expect(() => resolveConfig({ ledgerRoot: '  ' })).toThrow(/ledgerRoot/u)
    expect(() => resolveConfig({ reportRoot: '' })).toThrow(/reportRoot/u)
  })
})
