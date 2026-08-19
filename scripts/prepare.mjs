// Self-contained build used by both `pnpm run build` and the git-install
// `prepare` lifecycle: emits lib/types (tsc declarations) and lib/*.js
// (tsdown ESM bundles). Uses ONLY the build tools declared in `dependencies`
// because pnpm does not install devDependencies of git-hosted packages.
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

function binOf(packageName, binKey) {
  const pkgPath = require.resolve(`${packageName}/package.json`)
  const pkg = require(pkgPath)
  const bin = pkg.bin
  const entry = typeof bin === 'string' ? bin : bin?.[binKey]
  if (entry === undefined) throw new Error(`${packageName} declares no "${binKey}" bin`)
  return path.resolve(path.dirname(pkgPath), entry)
}

function run(bin, args) {
  const result = spawnSync(process.execPath, [bin, ...args], { stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// tsdown first (its `clean: true` wipes `lib/`), then tsc declarations into
// `lib/types` — the reverse order would let the clean delete the fresh types.
run(binOf('tsdown', 'tsdown'), [])
run(binOf('typescript', 'tsc'), ['-p', 'tsconfig.json'])
// TS 5.9 does not rewrite `.ts` specifiers in declaration emit; fix them so
// NodeNext declaration consumers can resolve lib/types.
run(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fix-dts.mjs'), [])
console.log('build complete: lib/types + lib/index.js')
