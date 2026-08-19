/**
 * Capture/gather tests over the REAL `ctx.web` seam (WebRuntime) with scripted
 * search/fetch PROVIDERS registered through the seam's public registry — the
 * service under test is real; only the network backends are staged.
 * @module dsh-research-report/test/gather.spec
 */

import { afterEach, describe, expect, it } from 'vitest'
import WebRuntime from '@deepseek-ai/dsh-web'
import type { WebFetchProvider, WebSearchProvider } from '@deepseek-ai/dsh-web'
import { executeTool, mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'
import { CaptureError, resolveWorkspacePath } from '../src/gather.ts'
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

/** A scripted fetch provider: one real implementation of the seam interface. */
function scriptedFetch(routes: Record<string, { status: number; body: string } | 'throw'>): WebFetchProvider {
  return {
    id: 'scripted-fetch',
    available: () => true,
    async fetch(request) {
      const route = routes[request.url]
      if (route === undefined) return { url: request.url, statusCode: 404, body: { kind: 'text', content: 'not found' }, truncated: false }
      if (route === 'throw') throw new Error('boom')
      return { url: request.url, statusCode: route.status, body: { kind: 'text', content: route.body }, truncated: false }
    },
  }
}

/** A scripted search provider over a fixed source list. */
function scriptedSearch(urls: string[]): WebSearchProvider {
  return {
    id: 'scripted-search',
    available: () => true,
    async search() {
      return { sources: urls.map(url => ({ url, title: `page ${url}` })), truncated: false }
    },
  }
}

/** Mount base + real WebRuntime + the plugin. */
async function setup(sessionId: string): Promise<BaseHarness> {
  const base = await mountBase(sessionId)
  bases.push(base)
  fibers.push(await base.ctx.plugin(WebRuntime))
  fibers.push(await mountPlugin(base))
  return base
}

describe('capture through the real web seam', () => {
  it('captures a URL snapshot when a fetch provider serves it', async () => {
    const base = await setup('gather-fetch-ok')
    base.ctx.web.registerFetchProvider(scriptedFetch({ 'https://example.com/a': { status: 200, body: '规模为 1,280 亿元' } }))
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'https://example.com/a' }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.origin).toBe('https://example.com/a')
  })

  it('reports a non-2xx fetch as a domain failure (no snapshot)', async () => {
    const base = await setup('gather-fetch-404')
    base.ctx.web.registerFetchProvider(scriptedFetch({}))
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'https://example.com/missing' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FETCH_STATUS')
  })

  it('reports a provider failure as FETCH_FAILED', async () => {
    const base = await setup('gather-fetch-throw')
    base.ctx.web.registerFetchProvider(scriptedFetch({ 'https://example.com/x': 'throw' }))
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'https://example.com/x' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FETCH_FAILED')
  })

  it('fails loud when the seam is mounted but no fetch provider is usable', async () => {
    const base = await setup('gather-no-provider')
    const result = valueOf<EvidenceAddValue>(await executeTool(base, 'evidence_add', { origin: 'https://example.com/x' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FETCH_FAILED') // WebError WEB_PROVIDER_UNAVAILABLE wrapped
  })
})

describe('gather candidates', () => {
  it('registers captured sources and lists uncaptured ones as gaps', async () => {
    const base = await setup('gather-mixed')
    base.ctx.web.registerSearchProvider(scriptedSearch(['https://example.com/ok', 'https://example.com/bad']))
    base.ctx.web.registerFetchProvider(scriptedFetch({ 'https://example.com/ok': { status: 200, body: '正文快照' } }))
    const result = valueOf<ResearchReportValue>(await executeTool(base, 'research_report', { topic: '示例行业', gather: true }))
    expect(result.kind).toBe('gathered')
    if (result.kind !== 'gathered') return
    const captured = result.candidates.filter(candidate => candidate.status === 'captured')
    const uncaptured = result.candidates.filter(candidate => candidate.status === 'uncaptured')
    expect(captured).toHaveLength(1)
    expect(captured[0]?.evidenceId).toMatch(/^ev-[0-9a-f]{12}$/u)
    expect(uncaptured).toHaveLength(1)
    expect(uncaptured[0]?.reason).toContain('FETCH_STATUS')
    expect(result.gaps.length).toBeGreaterThan(0)
    // Nothing was assembled.
    const summary = await executeTool(base, 'ledger_query', {})
    expect(summary.isError).toBe(false)
  })
})

describe('workspace path guard', () => {
  it('refuses escapes and normalizes both sides before comparing', () => {
    expect(() => resolveWorkspacePath(process.cwd(), '../../outside.md')).toThrow(CaptureError)
    const inside = resolveWorkspacePath(process.cwd(), 'fixtures/market-size.md')
    expect(inside.replace(/\\/gu, '/')).toContain('/fixtures/market-size.md')
  })
})
