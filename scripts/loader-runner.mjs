// scripts/loader-runner.mjs — real Loader composition runner (community
// five-layer model, layer 4). An independent process boots a real Context,
// mounts the vendored Loader with the Include builtin, reads the given
// cordis.yml (service rows + plugin row + config), then asserts the plugin's
// contributions through the authoritative registries and executes one real
// behavior: evidence_add over a local fixture file, then ledger_query back.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml> <fixture-file>
// Exit 0 prints DSH_LOADER_RESULT <json>; any assertion or load failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const configArgument = process.argv[2]
const fixtureArgument = process.argv[3]
if (configArgument === undefined) {
  console.error('usage: loader-runner.mjs <cordis.yml> [fixture-file]')
  process.exit(2)
}

const configPath = resolve(configArgument)
// Resolve bare package rows from this repository's dependency tree so the
// composition works with config files written anywhere (e.g. a temp dir).
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

const ctx = new Context()
try {
  ctx.baseUrl = `${pathToFileURL(dirname(configPath)).href}/`
  await ctx.plugin(Loader)
  ctx.loader.internal = /** @type {any} */ ({
    version: 'v2',
    async import(specifier) {
      if (specifier.startsWith('file:')) return import(specifier)
      if (specifier.startsWith('node:')) return import(specifier)
      const absolute = /^([a-zA-Z]:)?[\\/]/u.test(specifier)
      return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)
    },
  })
  ctx.loader.builtins.include = Include
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()

  // Authoritative registries carry the plugin's contributions.
  const schemas = ctx.tools.schemas()
  for (const toolName of ['evidence_add', 'research_report', 'ledger_query']) {
    if (!schemas.some(schema => schema.name === toolName)) {
      throw new Error(`Loader composition: ${toolName} tool is missing from the tools registry`)
    }
  }
  if (ctx.get('researchReport') === undefined) {
    throw new Error('Loader composition: ctx.researchReport service is missing')
  }

  // Real behavior through the real tool runtime: add one local fixture as
  // evidence, then read the binding back.
  let addedId
  if (fixtureArgument !== undefined) {
    const fixturePath = resolve(fixtureArgument)
    const session = ctx.sessions.create(SessionId('dsh-research-report-loader-runner'))
    const agent = /** @type {any} */ ({
      id: session.id,
      options: { provider: 'deepseek', model: 'demo-model' },
      session,
      inbox: {},
      status: 'idle',
      ctx,
      cancel: () => undefined,
      whenIdle: async () => undefined,
      runMaintenance: async (task) => task(new AbortController().signal),
      send: () => undefined,
      followup: () => undefined,
      steer: () => undefined,
      inject: () => undefined,
    })
    const added = await ctx.tools.execute({
      callId: /** @type {any} */ ('loader-1'),
      name: 'evidence_add',
      arguments: { origin: fixturePath, title: 'loader fixture' },
      agent,
      signal: new AbortController().signal,
    })
    const addedText = added.content.map(block => ('text' in block ? block.text : '')).join('')
    if (added.isError || !addedText.includes('ev-')) {
      throw new Error(`Loader composition: evidence_add failed: ${addedText}`)
    }
    addedId = /ev-[0-9a-f]{12}/u.exec(addedText)?.[0]
    const queried = await ctx.tools.execute({
      callId: /** @type {any} */ ('loader-2'),
      name: 'ledger_query',
      arguments: { evidenceId: addedId },
      agent,
      signal: new AbortController().signal,
    })
    const queriedText = queried.content.map(block => ('text' in block ? block.text : '')).join('')
    if (queried.isError || !queriedText.includes(addedId ?? '')) {
      throw new Error(`Loader composition: ledger_query failed: ${queriedText}`)
    }
  }

  const summary = {
    tools: schemas.map(schema => schema.name),
    service: 'researchReport',
    ...(addedId === undefined ? {} : { evidenceId: addedId }),
  }
  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify(summary)}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}
