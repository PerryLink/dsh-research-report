/**
 * Shared test harness: REAL Cordis `Context`, REAL `SessionStore`/`Session`,
 * the REAL `SystemPrompt`/`ToolRuntime` registries, and the REAL process-local
 * job registry (`LocalJobRegistry` with a test controller attached) from the
 * 0.1.2-rc.1 peers. Nothing here is a hand-written mock of a service.
 * @module dsh-research-report/test/harness
 */

import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { LocalJobRegistry } from '@deepseek-ai/dsh-jobs-local'
import type { Agent } from '@deepseek-ai/dsh-agent'

/** Everything a mounted base hands back to a test. */
export interface BaseHarness {
  /** The mounting context (session store + system prompt + tools + jobs). */
  readonly ctx: Context
  /** A real session created on the mounted store. */
  readonly session: Session
  /** A minimal real-shaped agent pointing at the session (for scoped resolution). */
  readonly agent: Agent
  /** The temp root owning the ledger/report directories (delete on teardown). */
  readonly root: string
}

/**
 * Mount the real services the plugin injects, plus a real session and a
 * minimal agent for scoped tool resolution. The temp root is fresh per base.
 * @param sessionId - session id to create (defaults to `rr-harness`).
 * @param options - `jobs: false` mounts without the local job registry (for
 *   the "no jobs" verifier path).
 * @returns the mounted base.
 */
export async function mountBase(sessionId = 'rr-harness', options: { jobs?: boolean } = {}): Promise<BaseHarness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId(sessionId))
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(ToolRuntime)
  if (options.jobs !== false) {
    await ctx.plugin(LocalJobRegistry, { maxConcurrentJobsPerOwner: 10 })
    // A root-attached controller serves every owner (dsh-tool-jobs plays this
    // role in the shipped profiles).
    ctx.jobs.attachController('test')
  }
  const root = await mkdtemp(path.join(tmpdir(), 'rr-test-'))
  const agent = {
    id: session.id,
    session,
    status: 'idle',
    options: {},
    reserveTurnAdmission: () => () => undefined,
  } as unknown as Agent
  return { ctx, session, agent, root }
}

/** Remove the temp root a base was mounted on (only own mkdtemp dirs). */
export async function unmountBase(base: BaseHarness): Promise<void> {
  const expected = path.join(tmpdir(), 'rr-test-')
  if (!base.root.startsWith(expected)) throw new Error(`refusing to remove non-harness dir: ${base.root}`)
  // Async fire-and-forget jobs (the read-only verifier appends to the sealed
  // note after `assemble` returns) race the removal: their O_CREAT append can
  // re-create a file between the recursive unlink pass and the final rmdir,
  // surfacing as ENOTEMPTY on Linux. Retry briefly to close that window.
  for (let attempt = 0; ; attempt++) {
    try {
      await rm(base.root, { recursive: true, force: true })
      return
    } catch (error) {
      if (attempt >= 20) throw error
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }
}

/** Mount the plugin under test on a harness context with temp-rooted config. */
export async function mountPlugin(base: BaseHarness, config: Record<string, unknown> = {}) {
  const plugin = await import('../src/index.ts')
  return base.ctx.plugin(plugin as never, {
    ledgerRoot: path.join(base.root, 'ledger'),
    reportRoot: path.join(base.root, 'reports'),
    ...config,
  } as never)
}

let callCounter = 0

/**
 * Execute one registered tool through the REAL tool runtime pipeline.
 * @param base - the mounted base.
 * @param name - the tool name.
 * @param args - the arguments (validated by the registry).
 * @param options - set `agent: false` for an agentless execution (background
 *   jobs then start unowned; the minimal harness agent is not enrolled in a
 *   real agents registry, which job ownership validation requires).
 * @returns the settled execution result.
 */
export async function executeTool(
  base: BaseHarness,
  name: string,
  args: Record<string, unknown>,
  options: { agent?: boolean } = {},
): Promise<ToolExecutionResult> {
  callCounter += 1
  const CallId = ((id: string) => id) as unknown as (id: string) => ToolExecution['callId']
  return base.ctx.tools.execute({
    callId: CallId(`rr-test-${callCounter}`),
    name,
    arguments: args,
    ...(options.agent === false ? {} : { agent: base.agent }),
    signal: new AbortController().signal,
  })
}
