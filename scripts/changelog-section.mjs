#!/usr/bin/env node
// Extract the CHANGELOG section for one version for the GitHub Release notes.
// Prints nothing (exit 0) when the version has no section, so the release
// workflow can fall back to `gh release create --generate-notes`.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('usage: node scripts/changelog-section.mjs <x.y.z>')
  process.exit(1)
}
const changelog = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
const startMarker = `## [${version}]`
const start = changelog.indexOf(startMarker)
if (start === -1) process.exit(0)
const end = changelog.indexOf('\n## [', start + startMarker.length)
const section = changelog.slice(start, end === -1 ? undefined : end)
process.stdout.write(`${section.trim()}\n`)
