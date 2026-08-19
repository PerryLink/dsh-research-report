#!/usr/bin/env node
// Frozen cross-plugin contract gate. Two type blocks are byte-frozen with
// sibling plugins developed against this package (dsh-industry-research
// consumes ctx.researchReport.assemble; dsh-data-quality provides the optional
// ctx.dataQuality bridge). This script fails when the source drifts from the
// frozen text by even one byte.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const REPORT_CONTRACT = `export interface ReportSectionInput {
  heading: string
  /** Paragraphs; each claim string may carry citations. */
  paragraphs: Array<{ text: string; claimIds?: string[] }>
}
export interface EvidenceInput {
  id: string
  title: string
  /** Where the evidence came from (URL or workspace path). */
  origin: string
  /** Verbatim content snapshot used for byte-level checks. */
  content: string
  /** ISO-8601 time the snapshot was captured. */
  capturedAt: string
}
export interface AssembleReportRequest {
  title: string
  topic: string
  evidence: EvidenceInput[]
  sections: ReportSectionInput[]
  /** Every claim id referenced in sections must be registered here. */
  claims: Array<{ id: string; text: string; evidenceIds: string[] }>
}
export interface AssembleReportResult {
  /** Workspace path of the sealed report directory (report.md + manifest.json). */
  reportDir: string
  /** SHA-256 content hash of manifest.json. */
  sealHash: string
  /** Per-claim verification verdicts. */
  verdicts: Array<{ claimId: string; status: 'verified' | 'unverified' | 'contradicted'; note?: string }>
}`

const DATA_QUALITY_CONTRACT = `export interface CitationCheckRequest {
  /** Workspace-relative path of the source dataset snapshot (CSV/JSON). */
  dataset: string
  /** Citations to verify against the dataset. */
  citations: Array<{
    /** Stable id chosen by the caller, echoed back in results. */
    id: string
    /** JSON-path-ish locator, e.g. "rows[3].nav" or "summary.annualReturn". */
    path: string
    /** The value as cited in the document. */
    value: number | string
    /** Optional relative tolerance for numeric comparison, e.g. 0.01 = 1%. */
    tolerance?: number
  }>
}
export interface CitationCheckResult {
  results: Array<{
    id: string
    status: 'verified' | 'mismatch' | 'not-found' | 'unverifiable'
    /** Actual value found at path, when found. */
    actual?: number | string
    /** Human-readable evidence note. */
    note?: string
  }>
}`

const failures = []
const serviceSource = readFileSync(path.join(root, 'src', 'service.ts'), 'utf8')
if (!serviceSource.includes(REPORT_CONTRACT)) {
  failures.push('src/service.ts: the frozen AssembleReport contract block drifted (see PHASE2 prompt §6.2/§7)')
}
const verifySource = readFileSync(path.join(root, 'src', 'verify.ts'), 'utf8')
if (!verifySource.includes(DATA_QUALITY_CONTRACT)) {
  failures.push('src/verify.ts: the frozen CitationCheck contract block drifted (see PHASE2 prompt §7)')
}

if (failures.length > 0) {
  console.error('frozen-contract check failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('frozen-contract: both byte-frozen blocks are verbatim in src/')
