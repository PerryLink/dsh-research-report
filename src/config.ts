/**
 * Config schema and resolution for `dsh-research-report`. Every tunable is a
 * validated {@link Config} field changeable from cordis.yml; the resolution
 * step validates bounds so misconfiguration fails loud at mount.
 * @module dsh-research-report/config
 */

import path from 'node:path'
import z from '@deepseek-ai/schemastery'

/** Raw plugin config — every field optional; {@link resolveConfig} supplies the defaults. */
export interface Config {
  /** Master switch. `false` mounts nothing (no service, no tools, no prompt section). */
  enabled?: boolean
  /**
   * Evidence-ledger directory (content-addressed objects + JSONL journals),
   * resolved against the harness working directory when relative.
   */
  ledgerRoot?: string
  /**
   * Sealed-report root; each assemble writes
   * `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/{report.md,manifest.json}`.
   * Resolved against the harness working directory when relative.
   */
  reportRoot?: string
  /** Hard cap on one evidence snapshot's UTF-8 byte size. */
  maxEvidenceBytes?: number
  /** Hard cap on how many evidence items one report may bind. */
  maxEvidencePerReport?: number
  /** Deadline (ms) for one `ctx.web` fetch during evidence capture. */
  fetchTimeoutMs?: number
  /**
   * When true, DOI-typed evidence (academic source) must carry a journal name
   * and publication year at registration, otherwise it fails loud. Defaults
   * to false so non-academic evidence is never gated by journal metadata.
   */
  requireJournalMetadata?: boolean
}

/** Fully resolved config handed to the runtime; roots are absolute paths. */
export interface ResolvedConfig {
  readonly enabled: boolean
  readonly ledgerRoot: string
  readonly reportRoot: string
  readonly maxEvidenceBytes: number
  readonly maxEvidencePerReport: number
  readonly fetchTimeoutMs: number
  readonly requireJournalMetadata: boolean
}

/** Schemastery schema: the loader validates and fills defaults before `apply`. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  ledgerRoot: z.string().default('.research-ledger'),
  reportRoot: z.string().default('research-reports'),
  maxEvidenceBytes: z.number().default(2 * 1024 * 1024),
  maxEvidencePerReport: z.number().default(200),
  fetchTimeoutMs: z.number().default(20_000),
  requireJournalMetadata: z.boolean().default(false),
})

/** Throw unless `value` is a positive safe integer. */
function assertPositiveInt(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer, got ${String(value)}`)
  }
}

/**
 * Resolve one configured root to an absolute path. Relative roots anchor at
 * the harness working directory (the workspace the deployment runs in), which
 * keeps the ledger and the sealed reports inside the workspace by default.
 * @param value - the configured root.
 * @param name - the config key, for error messages.
 * @returns the absolute root path.
 */
function resolveRoot(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty path`)
  }
  return path.resolve(value)
}

/**
 * Validate raw values and fill explicit defaults. Invalid bounds throw here —
 * misconfiguration fails loud at mount even without the Schemastery loader.
 * @param config - raw (possibly partial) plugin config.
 * @returns the fully resolved config.
 */
export function resolveConfig(config: Config = {}): ResolvedConfig {
  const maxEvidenceBytes = config.maxEvidenceBytes ?? 2 * 1024 * 1024
  assertPositiveInt('maxEvidenceBytes', maxEvidenceBytes)
  const maxEvidencePerReport = config.maxEvidencePerReport ?? 200
  assertPositiveInt('maxEvidencePerReport', maxEvidencePerReport)
  const fetchTimeoutMs = config.fetchTimeoutMs ?? 20_000
  assertPositiveInt('fetchTimeoutMs', fetchTimeoutMs)
  return {
    enabled: config.enabled ?? true,
    ledgerRoot: resolveRoot(config.ledgerRoot ?? '.research-ledger', 'ledgerRoot'),
    reportRoot: resolveRoot(config.reportRoot ?? 'research-reports', 'reportRoot'),
    maxEvidenceBytes,
    maxEvidencePerReport,
    fetchTimeoutMs,
    requireJournalMetadata: config.requireJournalMetadata ?? false,
  }
}
