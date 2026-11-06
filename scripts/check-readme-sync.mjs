#!/usr/bin/env node
// Five-language README sync gate. After the dotted-name migration the English
// file is the source of truth: README.md is the Chinese primary edition and
// README.en.md is English. Every README must carry the same number of `## `
// sections, the same install command, the unified five-language switcher, and
// every configuration-table key. Section headings may be translated.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const FILES = ['README.md', 'README.en.md', 'README.es.md', 'README.pt.md', 'README.hi.md']
const SOURCE = 'README.en.md'
const INSTALL_COMMAND = 'dsh plugin --profile <name> add dsh-research-report'
const SWITCHER = '[简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)'

const failures = []
const read = (file) => {
  const filePath = path.join(root, file)
  if (!existsSync(filePath)) {
    failures.push(`${file} is missing`)
    return ''
  }
  return readFileSync(filePath, 'utf8')
}

const sectionCount = (text) => (text.match(/^## /gmu) ?? []).length

// Configuration-table keys: the first cell of every row under the
// "Configuration" section (until the next `## ` heading).
const configKeysOf = (text) => {
  const lines = text.split(/\r?\n/u)
  const start = lines.findIndex((line) => /^##\s+Configuration\s*$/u.test(line))
  if (start === -1) return []
  const end = lines.findIndex((line, index) => index > start && /^##\s+/u.test(line))
  const section = lines.slice(start, end === -1 ? undefined : end)
  const keys = []
  for (const line of section) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map((cell) => cell.trim())
    const key = cells[1]?.replace(/`/gu, '').trim()
    if (key === undefined || key === '' || key === 'Key' || /^-+$/u.test(key)) continue
    keys.push(key)
  }
  return [...new Set(keys)]
}

const contents = FILES.map(read)
const sourceText = read(SOURCE)
if (sourceText === '') process.exit(1)
const expectedSections = sectionCount(sourceText)
const expectedKeys = configKeysOf(sourceText)

for (const [index, file] of FILES.entries()) {
  const text = contents[index]
  if (text === undefined || text === '') continue
  if (sectionCount(text) !== expectedSections) {
    failures.push(`${file}: ${sectionCount(text)} '## ' sections, expected ${expectedSections}`)
  }
  if (!text.includes(INSTALL_COMMAND)) {
    failures.push(`${file}: missing the install command`)
  }
  if (!text.includes(SWITCHER)) {
    failures.push(`${file}: missing or altered five-language switcher`)
  }
  for (const key of expectedKeys) {
    if (!text.includes(`\`${key}\``)) failures.push(`${file}: missing the config key \`${key}\``)
  }
}

if (failures.length > 0) {
  console.error('readme-sync failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(`readme-sync: all ${FILES.length} READMEs share ${expectedSections} sections, the install command, the switcher, and ${expectedKeys.length} config keys`)
