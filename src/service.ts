/**
 * Service Definition of the verifiable research-report seam (`ctx.researchReport`).
 *
 * Three roles in one package (they evolve together): this file owns the
 * Definition — the frozen `assemble` contract, the evidence/claim vocabulary,
 * and the typed session events; `provider-local.ts` owns the local Provider
 * (filesystem ledger + byte-level verification); `tools/` owns the model-facing
 * Consumers.
 *
 * The `ReportSectionInput` / `EvidenceInput` / `AssembleReportRequest` /
 * `AssembleReportResult` block below is BYTE-FROZEN: sibling plugins
 * (dsh-industry-research) consume `ctx.researchReport.assemble` against this
 * exact text. `scripts/verify-frozen-contract.mjs` gates drift.
 *
 * @module dsh-research-report/service
 */

import { Context, Service } from '@deepseek-ai/cordis'

// ── Frozen contract (do not edit — see the module doc) ──────────────────────

export interface ReportSectionInput {
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
}

// ── Extended internal vocabulary (not part of the frozen block) ─────────────

/**
 * The verification verdict of one claim (byte-level + optional numeric bridge).
 * `disproven` means the bound evidence content explicitly falsifies the claim
 * (a label-anchored value differs); it is distinct from `contradicted`
 * (evidence integrity failure or numeric-bridge cross-check mismatch).
 */
export type VerdictStatus = 'verified' | 'unverified' | 'contradicted' | 'insufficient' | 'disproven'

/** One claim's verification outcome (same fields as the frozen result item). */
export interface ClaimVerdict {
  /** The claim this verdict belongs to. */
  claimId: string
  /** Byte-level (and optional numeric-bridge) outcome. */
  status: VerdictStatus
  /** Human-readable evidence note (missing citations, contradiction detail, …). */
  note?: string
}

/**
 * The in-package assemble result for the tool/manifest layers. The frozen
 * `AssembleReportResult` surface keeps the three-state verdict vocabulary for
 * sibling plugins; this detail carries the full vocabulary (including
 * `insufficient`) plus the pre-delivery re-audit's drift count.
 */
export interface AssembleReportDetail {
  /** Workspace path of the sealed report directory (report.md + manifest.json + journals). */
  reportDir: string
  /** SHA-256 content hash of manifest.json. */
  sealHash: string
  /** Per-claim verification verdicts (full vocabulary). */
  verdicts: ClaimVerdict[]
  /** Claims whose verdict drifted from a prior verified state during the re-audit. */
  driftCount: number
}

/**
 * Claim registration accepted by the tools layer: the frozen claim shape plus
 * the OPTIONAL numeric-bridge extension consumed when the claim's numbers cite
 * a structured workspace dataset and `ctx.dataQuality` is mounted.
 */
export interface ClaimRegistration {
  /** Stable claim id chosen by the caller. */
  id: string
  /** The claim text; numbers and quoted spans are byte-checked against evidence. */
  text: string
  /** Ledger evidence ids this claim binds to. */
  evidenceIds: string[]
  /** Workspace-relative dataset path (CSV/JSON) for the optional numeric bridge. */
  dataset?: string
  /** Dataset citations for `ctx.dataQuality.verifyCitations` (requires `dataset`). */
  citations?: Array<{
    /** Stable id chosen by the caller, echoed back in results. */
    id: string
    /** JSON-path-ish locator, e.g. "rows[3].nav". */
    path: string
    /** The value as cited in the claim. */
    value: number | string
    /** Optional relative tolerance for numeric comparison, e.g. 0.01 = 1%. */
    tolerance?: number
  }>
}

/** Input for registering one evidence snapshot in the ledger. */
export interface AddEvidenceInput {
  /** Caller-chosen evidence id; omitted derives a content-addressed `ev-<hash12>` id. */
  id?: string
  /** Display title. */
  title: string
  /** Where the evidence came from (URL, DOI, or workspace path). */
  origin: string
  /** Verbatim content snapshot used for byte-level checks. */
  content: string
  /** ISO-8601 capture time; defaults to the registration clock. */
  capturedAt?: string
  /** Journal name (optional; used by the requireJournalMetadata gate for DOI evidence). */
  journal?: string
  /** Publication year (optional; used by the requireJournalMetadata gate for DOI evidence). */
  year?: string
  /** Session-event anchor (optional): the session log range that is the authoritative source. */
  sessionRef?: SessionRef
}

/**
 * A session-event anchor: the session log range that is the authoritative
 * source of an evidence snapshot. Session-anchored evidence is not byte-verified
 * against a durable snapshot — it is marked `unverified` and must be re-checked
 * against the session log manually (an honest declaration, not fabricated
 * verifiability).
 */
export interface SessionRef {
  /** The session whose log holds the source events. */
  sessionId: string
  /** The inclusive event range `[start, end]` within that session's log. */
  eventRange: { start: number; end: number }
}

/** Durable ledger facts of one evidence snapshot. */
export interface EvidenceRecord {
  /** Ledger id (caller-chosen or `ev-<hash12>`). */
  id: string
  /** SHA-256 hex of the snapshot content (the object address). */
  hash: string
  /** Display title. */
  title: string
  /** Where the evidence came from (URL, DOI, or workspace path). */
  origin: string
  /** ISO-8601 capture time. */
  capturedAt: string
  /** UTF-8 byte length of the snapshot. */
  bytes: number
  /** Journal name, when provided for DOI evidence. */
  journal?: string
  /** Publication year, when provided for DOI evidence. */
  year?: string
  /** Session-event anchor, when the evidence is anchored to a session log range. */
  sessionRef?: SessionRef
}

/** Integrity state of a stored snapshot, recomputed on every read. */
export type EvidenceIntegrity = 'ok' | 'tampered' | 'missing'

/** Read view of one ledger evidence item; content stays in the object store. */
export interface EvidenceView extends EvidenceRecord {
  /** `ok` when the object bytes still hash to the indexed value. */
  integrity: EvidenceIntegrity
}

/** Stored verdict record (latest write wins on read). */
export interface StoredVerdict extends ClaimVerdict {
  /** ISO-8601 time the verdict was written. */
  at: string
}

/** Read view of one registered claim and its latest verdict, when any. */
export interface ClaimView {
  /** The claim id. */
  id: string
  /** The claim text. */
  text: string
  /** Bound evidence ids. */
  evidenceIds: string[]
  /** Optional numeric-bridge dataset citation carried from registration. */
  dataset?: string
  /** Latest stored verdict; absent when the claim was never verified. */
  verdict?: StoredVerdict
}

/** Aggregate ledger counts for summary queries. */
export interface LedgerSummary {
  /** Registered evidence count. */
  evidenceCount: number
  /** Registered claim count. */
  claimCount: number
  /** Claims carrying a stored verdict. */
  verdictCount: number
  /** Evidence items whose object failed the read-time re-hash. */
  tamperedCount: number
}

/** Optional assemble-time context: the owning session for event logging. */
export interface AssembleContext {
  /** The session whose log receives the research-report/* events, when known. */
  session?: import('@deepseek-ai/dsh-session').Session
}

// ── Session events (typed, merge-extended) ──────────────────────────────────

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * One evidence snapshot entered the ledger (id ↔ content hash binding).
     * Log-only audit record; the ledger itself is the durable source of truth.
     * @mode emit
     * @param id - ledger evidence id.
     * @param hash - SHA-256 of the snapshot bytes.
     * @param origin - where the evidence came from (URL or workspace path).
     * @param title - display title.
     * @param capturedAt - ISO-8601 capture time.
     * @param bytes - UTF-8 byte length.
     * @param deduplicated - true when the content was already stored.
     */
    'research-report/evidence': {
      id: string
      hash: string
      origin: string
      title: string
      capturedAt: string
      bytes: number
      deduplicated: boolean
    }
    /**
     * One claim's verification verdict was written back to the ledger.
     * Log-only audit record; `verdicts.jsonl` is the durable source of truth.
     * @mode emit
     * @param claimId - the verified claim.
     * @param status - verified | unverified | contradicted | insufficient.
     * @param note - human-readable evidence note.
     * @param evidenceIds - the bindings the verdict was computed over.
     */
    'research-report/verify': {
      claimId: string
      status: VerdictStatus
      note?: string
      evidenceIds: string[]
    }
    /**
     * A report directory was sealed (manifest written, hash computed).
     * Log-only audit record; `manifest.json` is the durable source of truth.
     * @mode emit
     * @param reportDir - workspace path of the sealed report directory.
     * @param sealHash - SHA-256 of manifest.json.
     * @param topic - the report topic.
     * @param title - the report title.
     * @param verdicts - the per-claim outcomes the seal covers.
     */
    'research-report/seal': {
      reportDir: string
      sealHash: string
      topic: string
      title: string
      verdicts: ClaimVerdict[]
    }
  }
}

// ── Background-job kind ─────────────────────────────────────────────────────

declare module '@deepseek-ai/dsh-jobs' {
  interface JobKindMap {
    /** Report assembly jobs started by the research_report tool. */
    'research-report': 'research-report'
    /** Read-only sealed-report verification jobs (the optional verifier loop). */
    'research-report-verify': 'research-report-verify'
  }
}

// ── The service ─────────────────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    researchReport: ResearchReportService
  }
}

/**
 * The verifiable research-report service (`ctx.researchReport`).
 *
 * `assemble` is the frozen cross-plugin surface: validate the request, verify
 * every claim against the ledger's immutable snapshots, render `report.md`
 * (unverified/contradicted claims stay visibly marked in the body), write
 * `manifest.json`, and seal the directory with the manifest's SHA-256.
 */
export abstract class ResearchReportService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'researchReport')
  }

  /**
   * Assemble and seal one report.
   * @param request - the frozen assemble request (see the module-level block).
   * @returns the sealed directory, its seal hash, and the per-claim verdicts.
   */
  abstract assemble(request: AssembleReportRequest): Promise<AssembleReportResult>

  /**
   * Register one evidence snapshot (content-addressed; same content dedupes).
   * @param input - the snapshot and its provenance.
   * @returns the durable record and whether this call created it.
   */
  abstract addEvidence(input: AddEvidenceInput): Promise<{ record: EvidenceRecord; deduplicated: boolean }>

  /**
   * Re-run verification for one registered claim and write back the verdict.
   * @param claimId - the claim to verify.
   * @returns the fresh verdict.
   */
  abstract verifyClaim(claimId: string): Promise<ClaimVerdict>

  /**
   * Read one evidence item; the snapshot is re-hashed on every read.
   * @param evidenceId - the ledger id.
   * @returns the view (with integrity), or undefined when unknown.
   */
  abstract getEvidence(evidenceId: string): Promise<EvidenceView | undefined>

  /**
   * Read the raw snapshot bytes of one evidence item (verification path).
   * @param evidenceId - the ledger id.
   * @returns the content plus integrity state, or undefined when unknown.
   */
  abstract readEvidenceContent(evidenceId: string): Promise<{ content: string; integrity: EvidenceIntegrity } | undefined>

  /**
   * Read one registered claim with its latest verdict.
   * @param claimId - the claim id.
   * @returns the view, or undefined when unknown.
   */
  abstract getClaim(claimId: string): Promise<ClaimView | undefined>

  /**
   * List every registered evidence item (re-hashed on read).
   * @returns all evidence views in registration order.
   */
  abstract listEvidence(): Promise<EvidenceView[]>

  /**
   * List every registered claim.
   * @returns all claim views in registration order.
   */
  abstract listClaims(): Promise<ClaimView[]>

  /**
   * Aggregate ledger counts.
   * @returns the summary (evidence/claim/verdict/tamper counts).
   */
  abstract summarize(): Promise<LedgerSummary>
}
