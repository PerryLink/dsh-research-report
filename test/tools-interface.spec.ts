/**
 * U2 — the triple-interface surface of every model tool, pinned against the
 * REAL ToolRuntime registry: (1) a model-facing parameter schema, (2) a
 * canonical output schema (the lossless-JSON value the execute body returns),
 * and (3) a content-block render projection (the model text). A tool that
 * loses its argument schema, its canonical value contract, or its renderer
 * fails loudly here instead of degrading silently in a session.
 * @module dsh-research-report/test/tools-interface.spec
 */

import { afterEach, describe, expect, it } from 'vitest'
import type { JsonValue } from '@deepseek-ai/dsh-tools'
import { mountBase, mountPlugin, unmountBase, type BaseHarness } from './harness.ts'

const fibers: Array<{ dispose(): Promise<void> }> = []
const bases: BaseHarness[] = []
afterEach(async () => {
  await Promise.all(fibers.splice(0).map(fiber => fiber.dispose()))
  await Promise.all(bases.splice(0).map(base => unmountBase(base)))
})

/** The smallest valid canonical value per tool (one representative branch). */
const canonicalValues: Record<string, JsonValue> = {
  evidence_add: {
    ok: true,
    evidenceId: 'ev-000000000000',
    hash: 'a'.repeat(64),
    bytes: 0,
    title: 'title',
    origin: 'origin',
    capturedAt: '2026-08-19T00:00:00.000Z',
    deduplicated: false,
  },
  ledger_query: {
    kind: 'summary',
    evidenceCount: 0,
    claimCount: 0,
    verdictCount: 0,
    tamperedCount: 0,
    evidenceIds: [],
    claimIds: [],
  },
  research_report: { kind: 'gathered', topic: 'topic', candidates: [], gaps: [] },
}

describe('tool triple interface (U2)', () => {
  it('declares parameter schema + canonical output + content blocks for all three tools', async () => {
    const base = await mountBase('tools-interface')
    bases.push(base)
    fibers.push(await mountPlugin(base))

    for (const name of ['evidence_add', 'research_report', 'ledger_query'] as const) {
      // 1. Model-facing parameter schema.
      const schema = base.ctx.tools.schemas().find(entry => entry.name === name)
      expect(schema, `${name}: parameter schema should be registered`).toBeDefined()
      expect(Object.keys(schema!.parameters).length, `${name}: parameter schema should not be empty`).toBeGreaterThan(0)

      // 2. Canonical output schema + 3. content-block render projection.
      const tool = base.ctx.tools.get(name)
      if (tool === undefined) throw new Error(`${name}: tool definition missing from the registry`)
      const outputSchema = tool.output.schema as { type?: string }
      expect(outputSchema.type, `${name}: canonical output schema should be object-rooted`).toBe('object')

      expect(typeof tool.output.render, `${name}: content-block render should be a function`).toBe('function')
      const blocks = tool.output.render({}, canonicalValues[name]!)
      expect(blocks.length, `${name}: render should produce at least one content block`).toBeGreaterThan(0)
      for (const block of blocks) {
        expect(block, `${name}: every rendered block should be a content block`).toHaveProperty('type')
      }
    }
  })
})
