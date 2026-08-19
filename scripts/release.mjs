#!/usr/bin/env node
/**
 * Release automation for dsh-research-report.
 *
 * Usage: node scripts/release.mjs <version> [--skip-gate]
 *
 * Steps, in order:
 *   1. Validate <version> (semver x.y.z, no leading `v`) and require a clean
 *      working tree.
 *   2. Write the version into package.json and src/version.ts, and stamp the
 *      `## [Unreleased]` CHANGELOG section into `## [<version>] - <UTC date>`.
 *   3. Run the full gate (typecheck, typecheck:ci, test, build,
 *      verify:self-contained, verify:artifacts, readme-sync, frozen-contract)
 *      against the bumped version.
 *   4. Commit `chore(release): <version>` and create the annotated `v<version>`
 *      tag (message: `dsh-research-report v<version>`).
 *
 * The script never pushes. `git push origin main --follow-tags` ships it; the
 * `release` workflow (release.yml) then re-runs the gate, publishes to npm
 * with provenance, and creates the GitHub Release from the CHANGELOG section.
 *
 * On gate failure the three written files are reverted, so the tree stays clean.
 *
 * @module dsh-research-report/scripts/release
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const version = process.argv[2]
const skipGate = process.argv.includes('--skip-gate')
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error(`usage: node scripts/release.mjs <x.y.z> [--skip-gate] (got: ${version ?? 'none'})`)
  process.exit(1)
}

/** Run one command with inherited stdio; throws on non-zero exit. */
function run(command, args) {
  console.error(`\n> ${command} ${args.join(' ')}`)
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    // On Windows pnpm resolves through a .cmd shim, which CreateProcess alone
    // cannot launch (ENOENT/EINVAL); go through the platform shell there.
    shell: process.platform === 'win32',
  })
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim()
}

// 1. A clean tree keeps the release commit exactly the version bump + stamp.
if (git('status', '--porcelain') !== '') {
  console.error('working tree is not clean; commit or stash before releasing')
  process.exit(1)
}

// 2. Bump the version and stamp the changelog.
const packagePath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
if (pkg.version === version) {
  console.error(`package.json already at ${version}; nothing to do`)
  process.exit(1)
}
pkg.version = version
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)

const versionSourcePath = resolve(root, 'src', 'version.ts')
let versionSource = readFileSync(versionSourcePath, 'utf8')
const versionLine = /(export const VERSION = ')\d+\.\d+\.\d+(')/u
if (versionLine.exec(versionSource) === null) {
  console.error('src/version.ts has no hardcoded VERSION line; cannot bump it')
  process.exit(1)
}
versionSource = versionSource.replace(versionLine, `$1${version}$2`)
writeFileSync(versionSourcePath, versionSource)

const changelogPath = resolve(root, 'CHANGELOG.md')
let changelog = readFileSync(changelogPath, 'utf8')
const unreleased = '## [Unreleased]'
if (!changelog.includes(unreleased)) {
  console.error(`CHANGELOG.md has no ${unreleased} section; add one with the release entries first`)
  process.exit(1)
}
const date = new Date().toISOString().slice(0, 10)
changelog = changelog.replace(unreleased, `## [${version}] - ${date}`)
writeFileSync(changelogPath, changelog)

// 3. Full gate against the bumped version; revert on failure.
try {
  if (!skipGate) {
    run('pnpm', ['run', 'typecheck'])
    run('pnpm', ['run', 'typecheck:ci'])
    run('pnpm', ['test'])
    run('pnpm', ['run', 'build'])
    run('pnpm', ['run', 'verify:self-contained'])
    run('pnpm', ['run', 'verify:artifacts'])
    run('node', ['scripts/check-readme-sync.mjs'])
    run('node', ['scripts/verify-frozen-contract.mjs'])
  } else {
    console.error('--skip-gate: skipping the gate suite (not recommended)')
  }
} catch (error) {
  console.error(`gate failed: ${error instanceof Error ? error.message : String(error)}`)
  console.error('reverting the version bump and changelog stamp')
  git('checkout', '--', 'package.json', 'CHANGELOG.md', 'src/version.ts')
  process.exit(1)
}

// 4. Commit and tag.
git('add', 'package.json', 'CHANGELOG.md', 'src/version.ts')
git('commit', '-m', `chore(release): ${version}`)
git('tag', '-a', `v${version}`, '-m', `dsh-research-report v${version}`)

console.error(`
released locally: commit + tag v${version}
next: git push origin main --follow-tags
`)
