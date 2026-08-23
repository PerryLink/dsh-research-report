/**
 * DOI validation tests: deterministic syntax checking (zero network) at the
 * unit level, plus the evidence_add integration — invalid DOIs fail loud, and
 * `requireJournalMetadata` gates DOI evidence only when enabled.
 * @module dsh-research-report/test/doi.spec
 */

import { afterEach, describe, expect, it } from 'vitest'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import { isDoiOrigin, normalizeDoi, validateDoi } from '../src/doi.ts'
import type { EvidenceAddValue } from '../src/tools/evidence-add.ts'

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

describe('isDoiOrigin / normalizeDoi', () => {
  it('recognizes bare DOIs, doi.org/dx.doi.org URLs, and doi: URNs', () => {
    expect(isDoiOrigin('10.1038/s41586-020-2649-2')).toBe(true)
    expect(isDoiOrigin('https://doi.org/10.1038/s41586-020-2649-2')).toBe(true)
    expect(isDoiOrigin('http://dx.doi.org/10.1109/5.771073')).toBe(true)
    expect(isDoiOrigin('doi:10.1000/182')).toBe(true)
    expect(isDoiOrigin('https://example.com/article')).toBe(false)
    expect(isDoiOrigin('fixtures/market-size.md')).toBe(false)
  })

  it('normalizes each recognized prefix to the canonical 10.xxxx/xxxx form', () => {
    expect(normalizeDoi('https://doi.org/10.1038/s41586-020-2649-2')).toBe('10.1038/s41586-020-2649-2')
    expect(normalizeDoi('doi:10.1109/5.771073')).toBe('10.1109/5.771073')
    expect(normalizeDoi('10.1000/182')).toBe('10.1000/182')
    expect(normalizeDoi('https://example.com/x')).toBeUndefined()
  })
})

describe('validateDoi', () => {
  it('accepts valid DOIs', () => {
    for (const doi of ['10.1038/s41586-020-2649-2', '10.1109/5.771073', 'https://doi.org/10.1038/s41586-020-2649-2']) {
      const outcome = validateDoi(doi)
      expect(outcome.valid, `expected valid: ${doi}`).toBe(true)
    }
  })

  it('returns the canonical DOI for a resolvable form', () => {
    const outcome = validateDoi('https://doi.org/10.1038/s41586-020-2649-2')
    expect(outcome.valid).toBe(true)
    if (outcome.valid) expect(outcome.doi).toBe('10.1038/s41586-020-2649-2')
  })

  it('rejects a non-DOI origin', () => {
    const outcome = validateDoi('https://example.com/article')
    expect(outcome.valid).toBe(false)
    if (!outcome.valid) expect(outcome.reason).toContain('not a DOI')
  })

  it('rejects a DOI without a registrant/suffix separator', () => {
    const outcome = validateDoi('10.1038')
    expect(outcome.valid).toBe(false)
  })

  it('rejects a too-short registrant code', () => {
    const outcome = validateDoi('10.1/abc')
    expect(outcome.valid).toBe(false)
    if (!outcome.valid) expect(outcome.reason).toContain('4-9 digit registrant')
  })

  it('rejects characters outside the DOI character set', () => {
    const outcome = validateDoi('10.1038/bad doi')
    expect(outcome.valid).toBe(false)
    if (!outcome.valid) expect(outcome.reason).toContain('outside the DOI set')
  })
})

describe('evidence_add DOI handling', () => {
  it('registers a valid DOI with inline content', async () => {
    const base = await mountBase('doi-valid')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: '10.1038/s41586-020-2649-2',
      content: '示例论文摘要',
      journal: 'Nature',
      year: '2020',
    }))
    expect(added.ok).toBe(true)
  })

  it('fails loud (INVALID_DOI) for a malformed DOI', async () => {
    const base = await mountBase('doi-invalid')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: '10.1038/bad doi',
      content: '示例论文摘要',
    }))
    expect(added.ok).toBe(false)
    if (!added.ok) expect(added.error.code).toBe('INVALID_DOI')
  })

  it('requires inline content for a DOI origin (never fetches)', async () => {
    const base = await mountBase('doi-no-content')
    bases.push(base)
    fibers.push(await mountPlugin(base))
    const added = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', {
      origin: 'https://doi.org/10.1038/s41586-020-2649-2',
    }))
    expect(added.ok).toBe(false)
    if (!added.ok) expect(added.error.code).toBe('INVALID_DOI')
  })

  it('gates journal/year only when requireJournalMetadata is enabled', async () => {
    // Enabled: DOI without journal/year fails loud; with them it registers.
    const gated = await mountBase('doi-gated')
    bases.push(gated)
    fibers.push(await mountPlugin(gated, { requireJournalMetadata: true }))
    const missing = valueOf<EvidenceAddValue>(await executeTool(gated, 'evidence_add', {
      origin: '10.1038/s41586-020-2649-2',
      content: '示例论文摘要',
    }))
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error.code).toBe('MISSING_JOURNAL_METADATA')
    const complete = valueOf<EvidenceAddValue>(await executeTool(gated, 'evidence_add', {
      origin: '10.1038/s41586-020-2649-2',
      content: '示例论文摘要',
      journal: 'Nature',
      year: '2020',
    }))
    expect(complete.ok).toBe(true)
    // Non-DOI evidence is never gated by journal metadata.
    const file = valueOf<EvidenceAddValue>(await executeTool(gated, 'evidence_add', { origin: 'fixtures/market-size.md' }))
    expect(file.ok).toBe(true)

    // Default (false): DOI without journal/year still registers.
    const open = await mountBase('doi-open')
    bases.push(open)
    fibers.push(await mountPlugin(open))
    const unGated = valueOf<EvidenceAddValue>(await executeTool(open, 'evidence_add', {
      origin: '10.1038/s41586-020-2649-2',
      content: '示例论文摘要',
    }))
    expect(unGated.ok).toBe(true)
  })
})
