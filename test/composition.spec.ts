/**
 * Real Loader composition suite (community five-layer model, layers 4–5):
 * an independent process mounts the Loader over a cordis.yml with the real
 * harness service rows (session/system-prompt/tools), then the plugin row
 * with config. The plugin row points at the built `lib/index.js`, so the
 * suite also carries the plain-Node built entry smoke. The negative
 * regressions are here too: invalid config fails loud, and a default export
 * fails with the missing-inject reason.
 * @module dsh-research-report/test/composition.spec
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runner = join(repositoryRoot, 'scripts', 'loader-runner.mjs')
const builtEntry = join(repositoryRoot, 'lib', 'index.js')
const fixture = join(repositoryRoot, 'fixtures', 'market-size.md')

const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-rr-loader-'))

/** One cordis.yml: real harness service rows, then the plugin row. */
function configFor(pluginRow: string, configLines: string[] = []): string {
  const ledgerRoot = join(temporaryRoot, 'ledger').replace(/\\/gu, '/')
  const reportRoot = join(temporaryRoot, 'reports').replace(/\\/gu, '/')
  return [
    "- name: '@deepseek-ai/dsh-session'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    `- name: ${JSON.stringify(pluginRow)}`,
    '  config:',
    `    ledgerRoot: ${JSON.stringify(ledgerRoot)}`,
    `    reportRoot: ${JSON.stringify(reportRoot)}`,
    ...configLines.map(line => `    ${line}`),
    '',
  ].join('\n')
}

function runRunner(configPath: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [runner, configPath, fixture], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

beforeAll(() => {
  // The plugin row points at the built bundle; `shell` resolves `pnpm` (.cmd)
  // on Windows.
  const build = spawnSync('pnpm', ['run', 'build'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env },
    timeout: 120_000,
  })
  if (build.status !== 0) {
    throw new Error(`build failed (${String(build.status)}):\n${build.stdout}\n${build.stderr}`)
  }
}, 120_000)

describe('Loader composition (built entry)', () => {
  it('mounts the plugin and runs evidence_add → ledger_query through the real seams', () => {
    const configPath = join(temporaryRoot, 'valid.yml')
    writeFileSync(configPath, configFor(pathToFileURL(builtEntry).href))
    const evidence = runRunner(configPath)
    expect(evidence.status, `stdout:\n${evidence.stdout}\nstderr:\n${evidence.stderr}`).toBe(0)
    const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
    expect(marker).not.toBeNull()
    const summary = JSON.parse(marker![1]!) as { tools: string[]; service: string; evidenceId?: string }
    for (const tool of ['evidence_add', 'research_report', 'ledger_query']) {
      expect(summary.tools).toContain(tool)
    }
    expect(summary.service).toBe('researchReport')
    expect(summary.evidenceId).toMatch(/^ev-[0-9a-f]{12}$/u)
  })

  it('rejects invalid config through the Loader for the expected reason', () => {
    const entryUrl = pathToFileURL(builtEntry).href
    const cases = [
      { lines: ["enabled: 'yes'"], reason: /expected boolean|enabled/u },
      { lines: ['maxEvidenceBytes: 0'], reason: /maxEvidenceBytes|positive/u },
      { lines: ['maxEvidencePerReport: -1'], reason: /maxEvidencePerReport|positive/u },
      { lines: ['fetchTimeoutMs: -5'], reason: /fetchTimeoutMs|positive/u },
    ]
    for (const entry of cases) {
      const configPath = join(temporaryRoot, 'invalid.yml')
      writeFileSync(configPath, configFor(entryUrl, entry.lines))
      const evidence = runRunner(configPath)
      expect(evidence.status, `invalid config unexpectedly mounted:\n${entry.lines.join('\n')}`).not.toBe(0)
      expect(evidence.stderr, `failed for the wrong reason:\n${evidence.stderr}`).toMatch(entry.reason)
    }
  })

  it('rejects a default export through the Loader with the missing-inject reason', () => {
    const wrapper = join(temporaryRoot, 'default-export.mjs')
    const builtUrl = pathToFileURL(builtEntry).href
    writeFileSync(wrapper, [
      `export { name, inject, Config, apply } from ${JSON.stringify(builtUrl)}`,
      `export { apply as default } from ${JSON.stringify(builtUrl)}`,
      '',
    ].join('\n'))
    const configPath = join(temporaryRoot, 'invalid-default.yml')
    writeFileSync(configPath, configFor(pathToFileURL(wrapper).href))
    const evidence = runRunner(configPath)
    expect(evidence.status).not.toBe(0)
    expect(evidence.stderr, `failed for the wrong reason:\n${evidence.stderr}`).toMatch(/without inject/u)
  })
})

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true })
})
