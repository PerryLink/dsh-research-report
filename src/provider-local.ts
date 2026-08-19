/**
 * The local Provider of the research-report seam: assembles the filesystem
 * evidence ledger, the byte-level verifier, the optional numeric bridge, and
 * the sealing renderer into the `ctx.researchReport` service implementation.
 * @module dsh-research-report/provider-local
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import type { WebRuntime } from '@deepseek-ai/dsh-web'
import {
  buildManifest,
  configFingerprint,
  renderReportMarkdown,
  serializeManifest,
  slugify,
  validateAssembleRequest,
  versionIdOf,
} from './assemble.ts'
import type { ReportPlan } from './assemble.ts'
import type { ResolvedConfig } from './config.ts'
import { captureSnapshot, gatherCandidates } from './gather.ts'
import type { CaptureDeps, GatherOutcome } from './gather.ts'
import { EvidenceLedger, LedgerError, sha256Of } from './ledger.ts'
import { ResearchReportService } from './service.ts'
import type {
  AddEvidenceInput,
  AssembleContext,
  AssembleReportRequest,
  AssembleReportResult,
  ClaimRegistration,
  ClaimVerdict,
  ClaimView,
  EvidenceIntegrity,
  EvidenceRecord,
  EvidenceView,
  LedgerSummary,
  VerdictStatus,
} from './service.ts'
import { combineOutcomes, mapBridgeResults, verifyClaimText } from './verify.ts'
import type { DataQualityBridge } from './verify.ts'
import { VERSION } from './version.ts'

/** A loud provider failure with a machine-routable code. */
export class ResearchReportError extends Error {
  /** The machine-routable failure code. */
  readonly code: 'EVIDENCE_TOO_LARGE' | 'CLAIM_UNKNOWN' | 'LEDGER'
  constructor(code: ResearchReportError['code'], message: string) {
    super(message)
    this.name = 'ResearchReportError'
    this.code = code
  }
}

/**
 * rc.6's persistence layer refuses a session log carrying an event type it
 * does not know, and rc.6 offers no plugin event-registration surface — so the
 * research-report/* events are appended only when the host build already knows
 * them. The ledger journals are always the durable source of truth; these
 * events are the in-log audit mirror and activate automatically once the host
 * learns the vocabulary.
 * @param session - the owning session, when known.
 * @param type - the event type.
 * @param append - the typed append thunk.
 */
function appendAudit(session: Session | undefined, type: string, append: () => void): void {
  if (session === undefined) return
  if (!KNOWN_SESSION_EVENT_TYPES.has(type)) return
  append()
}

/**
 * The local `ctx.researchReport` implementation. Everything durable lives in
 * the filesystem ledger; the service adds policy (caps), verification, and
 * sealing on top.
 */
export class LocalResearchReportService extends ResearchReportService {
  /** The content-addressed ledger. */
  private readonly ledger: EvidenceLedger
  /** The resolved plugin config. */
  private readonly config: ResolvedConfig
  /** Absolute workspace root for local capture and path display. */
  private readonly workspaceRoot: string

  /**
   * @param ctx - the plugin context.
   * @param config - the resolved plugin config.
   * @param workspaceRoot - absolute workspace root (the harness cwd).
   */
  constructor(ctx: Context, config: ResolvedConfig, workspaceRoot: string) {
    super(ctx)
    this.config = config
    this.workspaceRoot = workspaceRoot
    this.ledger = new EvidenceLedger(config.ledgerRoot)
  }

  /** The web seam, resolved at call time (HMR-safe; may be absent). */
  private get web(): WebRuntime | undefined {
    return this.ctx.get('web') as WebRuntime | undefined
  }

  /** The optional numeric bridge, resolved at call time (never injected). */
  private get dataQuality(): DataQualityBridge | undefined {
    return this.ctx.get('dataQuality') as unknown as DataQualityBridge | undefined
  }

  /** Capture dependencies for the gather/capture paths. */
  private get captureDeps(): CaptureDeps {
    return { web: this.web, fetchTimeoutMs: this.config.fetchTimeoutMs, workspaceRoot: this.workspaceRoot }
  }

  /**
   * Register one evidence snapshot. Over-size content is refused loudly;
   * same-content registrations dedupe.
   * @param input - the snapshot and its provenance.
   * @param session - the owning session (audit event), when known.
   * @returns the durable record and whether this call created it.
   */
  async addEvidence(input: AddEvidenceInput, session?: Session): Promise<{ record: EvidenceRecord; deduplicated: boolean }> {
    const bytes = Buffer.byteLength(input.content, 'utf8')
    if (bytes > this.config.maxEvidenceBytes) {
      throw new ResearchReportError(
        'EVIDENCE_TOO_LARGE',
        `evidence content is ${bytes} bytes, above the configured maxEvidenceBytes ${this.config.maxEvidenceBytes}`,
      )
    }
    const capturedAt = input.capturedAt ?? new Date().toISOString()
    let outcome
    try {
      outcome = await this.ledger.putEvidence({
        ...(input.id === undefined ? {} : { id: input.id }),
        title: input.title,
        origin: input.origin,
        content: input.content,
        capturedAt,
      })
    } catch (error) {
      if (error instanceof LedgerError) throw new ResearchReportError('LEDGER', error.message)
      throw error
    }
    appendAudit(session, 'research-report/evidence', () => {
      session?.append('research-report/evidence', {
        id: outcome.record.id,
        hash: outcome.record.hash,
        origin: outcome.record.origin,
        title: outcome.record.title,
        capturedAt: outcome.record.capturedAt,
        bytes: outcome.record.bytes,
        deduplicated: !outcome.created,
      })
    })
    return { record: outcome.record, deduplicated: !outcome.created }
  }

  /**
   * Capture one origin (URL via ctx.web, workspace path via fs) and register
   * it. Provider-internal helper for the tools layer.
   * @param origin - URL or workspace path.
   * @param title - display title (defaults to the origin).
   * @param signal - caller cancellation.
   * @param session - the owning session (audit event), when known.
   * @returns the durable record and whether this call created it.
   */
  async captureAndRegister(
    origin: string,
    title: string | undefined,
    signal?: AbortSignal,
    session?: Session,
  ): Promise<{ record: EvidenceRecord; deduplicated: boolean }> {
    const snapshot = await captureSnapshot(this.captureDeps, origin, signal)
    return this.addEvidence({ title: title ?? snapshot.origin, origin: snapshot.origin, content: snapshot.content }, session)
  }

  /**
   * Run one topic gather: search + snapshot capture + registration. Never
   * auto-assembles; uncaptured sources land in the gap list.
   * @param topic - the research topic.
   * @param depth - quick | standard | deep.
   * @param signal - caller cancellation.
   * @param session - the owning session (audit events), when known.
   * @returns candidates plus gaps.
   */
  async gather(topic: string, depth: 'quick' | 'standard' | 'deep', signal?: AbortSignal, session?: Session): Promise<GatherOutcome> {
    return gatherCandidates(this.captureDeps, topic, depth, signal, async (input) => {
      const { record } = await this.addEvidence(input, session)
      return record
    })
  }

  /**
   * Verify one registered claim against its bound snapshots: integrity first
   * (tampered/missing ⇒ contradicted), then the byte-level check, then the
   * optional numeric bridge. The verdict is written back to the ledger.
   * @param claimId - the claim to verify.
   * @param session - the owning session (audit event), when known.
   * @returns the fresh verdict.
   */
  async verifyClaim(claimId: string, session?: Session): Promise<ClaimVerdict> {
    const claim = await this.ledger.getClaim(claimId)
    if (claim === undefined) {
      throw new ResearchReportError('CLAIM_UNKNOWN', `unknown claim id "${claimId}"`)
    }
    const verdict = await this.verifyRegistration(claim)
    await this.ledger.recordVerdict(
      {
        claimId,
        status: verdict.status,
        ...(verdict.note === undefined ? {} : { note: verdict.note }),
      },
      new Date().toISOString(),
    )
    appendAudit(session, 'research-report/verify', () => {
      session?.append('research-report/verify', {
        claimId,
        status: verdict.status,
        ...(verdict.note === undefined ? {} : { note: verdict.note }),
        evidenceIds: claim.evidenceIds,
      })
    })
    return verdict
  }

  /** Compute the verdict for one claim registration (no writeback). */
  private async verifyRegistration(claim: {
    id: string
    text: string
    evidenceIds: string[]
    dataset?: string
    citations?: Array<{ id: string; path: string; value: number | string; tolerance?: number }>
  }): Promise<ClaimVerdict> {
    const contents: string[] = []
    const broken: string[] = []
    for (const evidenceId of claim.evidenceIds) {
      const read = await this.ledger.readContent(evidenceId)
      if (read === undefined) {
        broken.push(`${evidenceId} (not in the ledger)`)
        continue
      }
      if (read.integrity !== 'ok') {
        broken.push(`${evidenceId} (${read.integrity}: object bytes no longer match the indexed hash)`)
        continue
      }
      contents.push(read.content)
    }
    let byte
    if (broken.length > 0) {
      byte = {
        status: 'contradicted' as const,
        note: `bound evidence failed the integrity check: ${broken.join('; ')}`,
        missing: [],
        contradictions: broken,
      }
    } else {
      byte = verifyClaimText(claim.text, contents)
    }

    let bridge: { status: VerdictStatus; note: string } | undefined
    if (claim.dataset !== undefined && claim.citations !== undefined && claim.citations.length > 0) {
      const dataQuality = this.dataQuality
      if (dataQuality === undefined) {
        bridge = {
          status: 'unverified',
          note: 'numeric dataset citations not cross-checked: ctx.dataQuality is not mounted (dsh-data-quality absent); byte-level check only',
        }
      } else {
        try {
          bridge = mapBridgeResults(await dataQuality.verifyCitations({ dataset: claim.dataset, citations: claim.citations }))
        } catch (error) {
          bridge = {
            status: 'unverified',
            note: `numeric dataset bridge failed: ${error instanceof Error ? error.message : String(error)}`,
          }
        }
      }
    }
    const combined = combineOutcomes(byte, bridge)
    return { claimId: claim.id, status: combined.status, note: combined.note }
  }

  /**
   * Assemble and seal one report: validate (loud), register evidence and
   * claims (idempotent; conflicts throw), verify every claim, render
   * `report.md` with visible markers for unverified/contradicted claims, write
   * `manifest.json`, and seal the versioned directory with the manifest hash.
   * @param request - the frozen assemble request.
   * @param context - optional assemble context (owning session for events).
   * @returns the sealed directory, the seal hash, and the per-claim verdicts.
   */
  async assemble(request: AssembleReportRequest, context?: AssembleContext): Promise<AssembleReportResult> {
    validateAssembleRequest(request, this.config)

    // Evidence: the ledger is authoritative and immutable. New ids register;
    // an existing id whose incoming content still matches the index is a
    // no-op; a mismatch against an INTACT object is a loud conflict, while a
    // mismatch explained by tampering flows into verification (contradicted).
    const records: EvidenceRecord[] = []
    for (const item of request.evidence) {
      const existing = await this.ledger.getEvidence(item.id)
      if (existing === undefined) {
        const added = await this.addEvidence(
          { id: item.id, title: item.title, origin: item.origin, content: item.content, capturedAt: item.capturedAt },
          context?.session,
        )
        records.push(added.record)
        continue
      }
      const incomingHash = sha256Of(item.content)
      if (incomingHash !== existing.hash) {
        const stored = await this.ledger.readContent(item.id)
        if (stored !== undefined && stored.integrity === 'ok') {
          throw new ResearchReportError(
            'LEDGER',
            `evidence id "${item.id}" is already registered with different content; snapshots are immutable — choose a new id`,
          )
        }
        // Tampered/missing object: verification over the current bytes will
        // produce the contradicted verdict; the index keeps the original hash.
      }
      records.push(existing)
    }

    await this.ledger.registerClaims(
      request.claims.map(claim => {
        const registration = claim as ClaimRegistration
        return {
          id: registration.id,
          text: registration.text,
          evidenceIds: registration.evidenceIds,
          ...(registration.dataset === undefined ? {} : { dataset: registration.dataset }),
          ...(registration.citations === undefined ? {} : { citations: registration.citations }),
        }
      }),
      new Date().toISOString(),
    )

    const verdicts: ClaimVerdict[] = []
    for (const claim of request.claims) {
      verdicts.push(await this.verifyClaim(claim.id, context?.session))
    }

    const generatedAt = new Date().toISOString()
    const fingerprint = configFingerprint(this.config)
    const plan: ReportPlan = { request, verdicts, evidence: records, generatedAt, fingerprint, pluginVersion: VERSION }
    const reportText = renderReportMarkdown(plan)
    const manifestText = serializeManifest(buildManifest(plan, sha256Of(reportText)))
    const sealHash = sha256Of(manifestText)

    const reportDir = await this.freshReportDir(request.topic, new Date(generatedAt))
    await writeFile(path.join(reportDir, 'report.md'), reportText, 'utf8')
    await writeFile(path.join(reportDir, 'manifest.json'), manifestText, 'utf8')

    appendAudit(context?.session, 'research-report/seal', () => {
      context?.session?.append('research-report/seal', {
        reportDir,
        sealHash,
        topic: request.topic,
        title: request.title,
        verdicts,
      })
    })
    return { reportDir, sealHash, verdicts }
  }

  /** Allocate the next versioned report directory for one topic (UTC clock). */
  private async freshReportDir(topic: string, at: Date): Promise<string> {
    const base = path.join(this.config.reportRoot, slugify(topic))
    await mkdir(base, { recursive: true })
    const stamp = versionIdOf(at)
    for (let suffix = 0; ; suffix++) {
      const candidate = path.join(base, suffix === 0 ? stamp : `${stamp}-${suffix + 1}`)
      try {
        await mkdir(candidate)
        return candidate
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
    }
  }

  /**
   * Read one evidence item (re-hashed on read).
   * @param evidenceId - the ledger id.
   * @returns the view, or undefined when unknown.
   */
  async getEvidence(evidenceId: string): Promise<EvidenceView | undefined> {
    const record = await this.ledger.getEvidence(evidenceId)
    if (record === undefined) return undefined
    const read = await this.ledger.readContent(evidenceId)
    const integrity: EvidenceIntegrity = read === undefined ? 'missing' : read.integrity
    return { ...record, integrity }
  }

  /**
   * Read one snapshot's bytes (re-hashed on read).
   * @param evidenceId - the ledger id.
   * @returns content plus integrity, or undefined when unknown.
   */
  async readEvidenceContent(evidenceId: string): Promise<{ content: string; integrity: EvidenceIntegrity } | undefined> {
    return this.ledger.readContent(evidenceId)
  }

  /**
   * Read one claim with its latest verdict.
   * @param claimId - the claim id.
   * @returns the view, or undefined when unknown.
   */
  async getClaim(claimId: string): Promise<ClaimView | undefined> {
    const claim = await this.ledger.getClaim(claimId)
    if (claim === undefined) return undefined
    const verdict = (await this.ledger.latestVerdicts()).get(claimId)
    return {
      id: claim.id,
      text: claim.text,
      evidenceIds: claim.evidenceIds,
      ...(claim.dataset === undefined ? {} : { dataset: claim.dataset }),
      ...(verdict === undefined
        ? {}
        : {
          verdict: {
            claimId: verdict.claimId,
            status: verdict.status,
            ...(verdict.note === undefined ? {} : { note: verdict.note }),
            at: verdict.at,
          },
        }),
    }
  }

  /**
   * List every registered evidence item (re-hashed on read).
   * @returns all evidence views in registration order.
   */
  async listEvidence(): Promise<EvidenceView[]> {
    const records = await this.ledger.listEvidence()
    const views: EvidenceView[] = []
    for (const record of records) {
      const read = await this.ledger.readContent(record.id)
      views.push({ ...record, integrity: read === undefined ? 'missing' : read.integrity })
    }
    return views
  }

  /**
   * List every registered claim with its latest verdict.
   * @returns all claim views in registration order.
   */
  async listClaims(): Promise<ClaimView[]> {
    const claims = await this.ledger.listClaims()
    const verdicts = await this.ledger.latestVerdicts()
    return claims.map(claim => {
      const verdict = verdicts.get(claim.id)
      return {
        id: claim.id,
        text: claim.text,
        evidenceIds: claim.evidenceIds,
        ...(claim.dataset === undefined ? {} : { dataset: claim.dataset }),
        ...(verdict === undefined
          ? {}
          : {
            verdict: {
              claimId: verdict.claimId,
              status: verdict.status,
              ...(verdict.note === undefined ? {} : { note: verdict.note }),
              at: verdict.at,
            },
          }),
      }
    })
  }

  /**
   * Aggregate ledger counts (evidence re-hashed for the tamper count).
   * @returns the summary.
   */
  async summarize(): Promise<LedgerSummary> {
    const evidence = await this.listEvidence()
    const claims = await this.ledger.listClaims()
    const verdicts = await this.ledger.latestVerdicts()
    return {
      evidenceCount: evidence.length,
      claimCount: claims.length,
      verdictCount: verdicts.size,
      tamperedCount: evidence.filter(item => item.integrity !== 'ok').length,
    }
  }
}
