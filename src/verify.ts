/**
 * Claim verification: the built-in byte-level check plus the optional numeric
 * bridge to `ctx.dataQuality`.
 *
 * Byte-level semantics (v1 is deliberately NON-semantic): every number and
 * quoted span in the claim text must be locatable VERBATIM in the bound
 * evidence snapshots. A citation that cannot be located makes the claim
 * `unverified`; a number whose left-context label appears in the snapshot
 * followed by a DIFFERENT number makes the claim `contradicted`. The check
 * proves "the claimed literals exist in the captured bytes", nothing more.
 *
 * The `CitationCheckRequest` / `CitationCheckResult` block below is BYTE-FROZEN:
 * it is the structural surface of the optional `ctx.dataQuality` service
 * (provided by the sibling dsh-data-quality plugin, consumed via `ctx.get` —
 * never imported, never injected). `scripts/verify-frozen-contract.mjs` gates
 * drift.
 *
 * @module dsh-research-report/verify
 */

// ── Frozen contract (do not edit — see the module doc) ──────────────────────

export interface CitationCheckRequest {
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
}

// ── The optional bridge surface ─────────────────────────────────────────────

/**
 * The structural surface of the optional `ctx.dataQuality` service. Declared
 * locally (never imported from the sibling package) and reached via
 * `ctx.get('dataQuality')` + an `as unknown as` assertion.
 */
export interface DataQualityBridge {
  /**
   * Verify citations against a structured dataset snapshot.
   * @param request - the dataset and its citations.
   * @returns per-citation outcomes.
   */
  verifyCitations(request: CitationCheckRequest): Promise<CitationCheckResult>
}

// ── Byte-level citation extraction ──────────────────────────────────────────

/** One literal citation extracted from a claim text. */
export interface Citation {
  /** What kind of literal this is. */
  kind: 'number' | 'quote'
  /** The literal text that must be locatable verbatim in bound evidence. */
  text: string
  /** Left-context label of a number citation (drives the contradiction check). */
  context?: string
}

/** Number literal: optional sign, grouped digits, decimals, trailing %. */
const NUMBER_PATTERN = /-?\d[\d,]*(?:\.\d+)?%?/gu

/** Quoted spans: ASCII double quotes, CJK corner brackets, full-width quotes. */
const QUOTE_PATTERNS = [
  /"([^"\n]{4,200})"/gu,
  /「([^」\n]{2,200})」/gu,
  /“([^“”\n]{4,200})”/gu,
]

/** The tail run of label characters (letters / CJK) ending a context window. */
const LABEL_PATTERN = /[\p{L}\p{N}_（）()%$-]{2,24}$/u

/**
 * Extract the trailing context label of a number citation: up to 24 characters
 * before the number, trimmed to its trailing label run. Too-short labels are
 * dropped (a weak label would false-positive the contradiction check).
 * @param text - the full claim text.
 * @param index - offset of the number in the text.
 * @returns the label, or undefined when there is no usable one.
 */
export function contextLabelOf(text: string, index: number): string | undefined {
  const window = text.slice(Math.max(0, index - 24), index).trimEnd()
  const match = LABEL_PATTERN.exec(window)
  const label = match?.[0].trim()
  if (label === undefined || label.length < 2) return undefined
  return label
}

/**
 * Extract every checkable citation from one claim text: number literals (with
 * their left-context labels) and quoted spans.
 * @param claimText - the claim to analyze.
 * @returns citations in first-seen order (duplicates kept once).
 */
export function extractCitations(claimText: string): Citation[] {
  const citations: Citation[] = []
  const seen = new Set<string>()
  for (const match of claimText.matchAll(NUMBER_PATTERN)) {
    const text = match[0]
    if (seen.has(`number:${text}`)) continue
    seen.add(`number:${text}`)
    const context = contextLabelOf(claimText, match.index)
    citations.push(context === undefined ? { kind: 'number', text } : { kind: 'number', text, context })
  }
  for (const pattern of QUOTE_PATTERNS) {
    for (const match of claimText.matchAll(pattern)) {
      const text = match[1]!
      if (seen.has(`quote:${text}`)) continue
      seen.add(`quote:${text}`)
      citations.push({ kind: 'quote', text })
    }
  }
  return citations
}

// ── Byte-level verification ─────────────────────────────────────────────────

/** The number token scan window after a context label (bytes of text). */
const CONTEXT_SCAN_WINDOW = 24

/** Normalize a number literal for comparison (drop grouping commas and %). */
export function normalizeNumber(text: string): string {
  return text.replace(/[,%]/gu, '')
}

/** The first number literal found in `text` from `from` (fresh regex — no shared lastIndex). */
function numberAfter(text: string, from: number): string | undefined {
  const window = text.slice(from, from + CONTEXT_SCAN_WINDOW)
  const match = /-?\d[\d,]*(?:\.\d+)?%?/u.exec(window)
  return match?.[0]
}

/** The outcome of the byte-level check of one claim. */
export interface ByteCheckOutcome {
  /** The three-state verdict. */
  status: 'verified' | 'unverified' | 'contradicted'
  /** Human-readable evidence note. */
  note: string
  /** Citations that could not be located verbatim. */
  missing: string[]
  /** Contradiction details (`label: claimed X, snapshot says Y`). */
  contradictions: string[]
}

/** Cap how many problem citations one note enumerates. */
const NOTE_LIST_CAP = 5

/**
 * Run the byte-level check of one claim against its bound evidence snapshots.
 * @param claimText - the claim text.
 * @param evidenceContents - the verbatim snapshot contents of the bound evidence.
 * @returns the outcome (never throws).
 */
export function verifyClaimText(claimText: string, evidenceContents: readonly string[]): ByteCheckOutcome {
  if (evidenceContents.length === 0) {
    return { status: 'unverified', note: 'claim binds no evidence snapshot', missing: [], contradictions: [] }
  }
  const haystack = evidenceContents.join('\n')
  const citations = extractCitations(claimText)
  if (citations.length === 0) {
    return {
      status: 'unverified',
      note: 'claim carries no checkable citation (number or quoted span); byte-level verification needs a literal to locate',
      missing: [],
      contradictions: [],
    }
  }
  const missing: string[] = []
  const contradictions: string[] = []
  for (const citation of citations) {
    if (citation.kind === 'quote') {
      if (!haystack.includes(citation.text)) missing.push(`"${citation.text}"`)
      continue
    }
    // Number citation, presence-first: a number locatable verbatim supports
    // the claim. The contradiction check runs only when the claimed number is
    // ABSENT — then a label occurrence carrying a different number means the
    // snapshot explicitly contradicts the claim (the audit-critical signal).
    if (haystack.includes(citation.text)) continue
    if (citation.context !== undefined) {
      let searchFrom = 0
      let different: string | undefined
      for (;;) {
        const at = haystack.indexOf(citation.context, searchFrom)
        if (at === -1) break
        const found = numberAfter(haystack, at + citation.context.length)
        if (found !== undefined && normalizeNumber(found) !== normalizeNumber(citation.text)) {
          different = found
          break
        }
        searchFrom = at + citation.context.length
      }
      if (different !== undefined) {
        contradictions.push(`${citation.context}: claim says ${citation.text}, snapshot says ${different}`)
        continue
      }
    }
    missing.push(citation.text)
  }
  if (contradictions.length > 0) {
    return {
      status: 'contradicted',
      note: `contradicts the snapshot: ${contradictions.slice(0, NOTE_LIST_CAP).join('; ')}`,
      missing,
      contradictions,
    }
  }
  if (missing.length > 0) {
    return {
      status: 'unverified',
      note: `citation(s) not found in bound evidence: ${missing.slice(0, NOTE_LIST_CAP).join(', ')}`,
      missing,
      contradictions,
    }
  }
  return {
    status: 'verified',
    note: `${citations.length} citation(s) located verbatim in the bound snapshot(s)`,
    missing,
    contradictions,
  }
}

// ── The numeric bridge mapping ──────────────────────────────────────────────

/**
 * Map one bridge result set onto the three-state verdict vocabulary.
 * `mismatch` maps to `contradicted`; `not-found`/`unverifiable` map to
 * `unverified`.
 * @param result - the dataQuality outcome.
 * @returns the mapped status plus a human-readable note.
 */
export function mapBridgeResults(result: CitationCheckResult): { status: 'verified' | 'unverified' | 'contradicted'; note: string } {
  const mismatch = result.results.filter(entry => entry.status === 'mismatch')
  if (mismatch.length > 0) {
    const detail = mismatch
      .slice(0, NOTE_LIST_CAP)
      .map(entry => `${entry.id}: dataset has ${String(entry.actual ?? '?')}${entry.note === undefined ? '' : ` (${entry.note})`}`)
      .join('; ')
    return { status: 'contradicted', note: `dataset cross-check mismatch: ${detail}` }
  }
  const unresolved = result.results.filter(entry => entry.status === 'not-found' || entry.status === 'unverifiable')
  if (unresolved.length > 0) {
    const detail = unresolved
      .slice(0, NOTE_LIST_CAP)
      .map(entry => `${entry.id}: ${entry.status}${entry.note === undefined ? '' : ` (${entry.note})`}`)
      .join('; ')
    return { status: 'unverified', note: `dataset cross-check unresolved: ${detail}` }
  }
  return { status: 'verified', note: `${result.results.length} dataset citation(s) verified via ctx.dataQuality` }
}

/**
 * Combine the byte-level and bridge outcomes: `contradicted` wins, then
 * `unverified`, then `verified`.
 * @param byte - the byte-level outcome.
 * @param bridge - the bridge outcome, when the numeric bridge ran.
 * @returns the combined status and a merged note.
 */
export function combineOutcomes(
  byte: ByteCheckOutcome,
  bridge: { status: 'verified' | 'unverified' | 'contradicted'; note: string } | undefined,
): { status: 'verified' | 'unverified' | 'contradicted'; note: string } {
  if (bridge === undefined) return { status: byte.status, note: byte.note }
  const rank = { verified: 0, unverified: 1, contradicted: 2 } as const
  const status = rank[bridge.status] > rank[byte.status] ? bridge.status : byte.status
  return { status, note: `${byte.note} | ${bridge.note}` }
}
