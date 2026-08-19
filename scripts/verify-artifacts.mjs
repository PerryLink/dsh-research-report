// Verify the built artifacts after `pnpm run build`: syntax-check the host
// bundle, import it under plain Node, and assert the shipped files the
// export path needs. Guards against TypeScript-only syntax leaking into
// shipped output and against a tarball missing the bundle patch.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  'lib/index.js',
  'lib/types/index.d.ts',
  'cordis.patch.yml',
]
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`missing artifact: ${rel}`)
}

// 1. Syntax-check the host bundle (plain Node parse; no execution).
execFileSync(process.execPath, ['--check', path.join(root, 'lib/index.js')], { stdio: 'inherit' })

// 2. No leftover `.ts` relative import specifiers anywhere under lib/ (the
//    runtime ESM loader would crash on them).
const leftovers = []
const scan = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      scan(full)
    } else if (/\.(?:js|d\.ts)$/u.test(entry)) {
      const text = readFileSync(full, 'utf8')
      if(/(?:from\s+|import\()['"]\.\.?\/[^'"]+?\.tsx?['"]/u.test(text)) leftovers.push(path.relative(root, full))
    }
  }
}
scan(path.join(root, 'lib'))
if (leftovers.length > 0) {
  throw new Error(`leftover .ts import specifiers in: ${leftovers.join(', ')}`)
}

// 3. The ESM host face must import under plain Node (no tsx, no checkout paths).
const index = await import(pathToFileURL(path.join(root, 'lib/index.js')).href)
if (typeof index.apply !== 'function' || index.name !== 'research-report') {
  throw new Error('lib/index.js exports an unexpected plugin face')
}
if (!Array.isArray(index.inject) || !index.inject.includes('tools') || !index.inject.includes('systemPrompt')) {
  throw new Error('lib/index.js does not declare the tools + systemPrompt injects')
}

// 4. The bundled config must expose the schema const and the resolve step,
//    and the frozen service contract types must be re-exported.
if (typeof index.Config !== 'function' || typeof index.resolveConfig !== 'function') {
  throw new Error('lib/index.js does not re-export Config and resolveConfig')
}
if (typeof index.ResearchReportService !== 'function') {
  throw new Error('lib/index.js does not re-export the ResearchReportService definition')
}

console.log('artifacts OK: syntax + no .ts leftovers + ESM import + plugin face + bundle patch present')
