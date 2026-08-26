/**
 * Standalone sealed-report verifier CLI. One command recomputes the seal hash
 * (SHA-256 of manifest.json), the report hash, and the audit-journal hashes,
 * re-runs the byte-level + integrity claim check against the evidence ledger,
 * and prints a SARIF 2.1.0 or JSON report. Zero network, zero model, zero
 * @deepseek-ai imports — this entry bundles to a self-contained binary.
 *
 * Usage:
 *   dsh-research-verify --report <dir> [--seal <sha256>] [--ledger <dir>] [--format json|sarif]
 *
 * @module dsh-research-report/cli
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { sha256Of } from './ledger.ts'
import type { ReportManifest } from './assemble.ts'
import {
  buildVerificationReport,
  renderSarif,
  renderVerificationJson,
  verifySealedReport,
} from './verify-sealed.ts'
import type { SealedVerificationDeps } from './verify-sealed.ts'

/** One parsed CLI argument set. */
interface CliArgs {
  reportDir: string
  seal: string | null
  ledger: string | null
  format: 'json' | 'sarif'
}

/** Print usage and exit non-zero. */
function usage(message?: string): never {
  if (message !== undefined) console.error(`dsh-research-verify: ${message}`)
  console.error('Usage: dsh-research-verify --report <dir> [--seal <sha256>] [--ledger <dir>] [--format json|sarif]')
  console.error('  --report <dir>    Sealed report directory (holds manifest.json + report.md).')
  console.error('  --seal <sha256>   Expected seal hash to compare the recomputed manifest hash against.')
  console.error('  --ledger <dir>    Evidence ledger root (objects/<sha256> + index.jsonl) for claim re-checks.')
  console.error('  --format <fmt>    Output format: json (default) or sarif.')
  process.exit(message === undefined ? 0 : 2)
}

/** Parse argv into {@link CliArgs}. */
function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { reportDir: '', seal: null, ledger: null, format: 'json' }
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]!
    switch (token) {
      case '--help':
      case '-h':
        usage()
        break
      case '--report':
        args.reportDir = argv[++index] ?? ''
        break
      case '--seal':
        args.seal = argv[++index] ?? null
        break
      case '--ledger':
        args.ledger = argv[++index] ?? null
        break
      case '--format':
        args.format = argv[++index] === 'sarif' ? 'sarif' : 'json'
        break
      default:
        usage(`unknown argument ${token}`)
    }
  }
  if (args.reportDir === '') usage('--report is required')
  return args
}

/** Read one evidence snapshot from a ledger root by its manifest evidence record. */
async function readLedgerEvidence(ledgerRoot: string, record: ReportManifest['evidence'][number]): Promise<{ content: string; integrity: 'ok' | 'tampered' | 'missing' } | undefined> {
  let content: string
  try {
    content = await readFile(path.join(ledgerRoot, 'objects', record.sha256), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { content: '', integrity: 'missing' }
    throw error
  }
  return { content, integrity: sha256Of(content) === record.sha256 ? 'ok' : 'tampered' }
}

/** The standalone verifier entry point. */
async function main(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv)

  const manifestText = await readFile(path.join(args.reportDir, 'manifest.json'), 'utf8')
  const manifest = JSON.parse(manifestText) as ReportManifest
  const sealHash = sha256Of(manifestText)

  const evidenceById = new Map((Array.isArray(manifest.evidence) ? manifest.evidence : []).map(record => [record.id, record]))

  // Without a ledger root, claim re-checks are skipped honestly (the seal/report/
  // journal hashes still recompute from the sealed directory alone).
  const claimRecheck = args.ledger === null ? 'skipped-no-ledger' as const : 'rechecked' as const

  const deps: SealedVerificationDeps = {
    readFile: (file: string) => readFile(file, 'utf8'),
    readEvidenceContent: async (id: string) => {
      if (args.ledger === null) return undefined
      const record = evidenceById.get(id)
      if (record === undefined) return undefined
      return readLedgerEvidence(args.ledger, record)
    },
  }

  const result = await verifySealedReport(args.reportDir, args.seal ?? sealHash, deps)
  const report = buildVerificationReport(result, args.reportDir, args.seal, claimRecheck)

  process.stdout.write(args.format === 'sarif' ? renderSarif(report) : renderVerificationJson(report))
  if (!report.ok) process.exitCode = 1
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`dsh-research-verify: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
