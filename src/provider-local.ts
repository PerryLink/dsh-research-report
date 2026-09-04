/**
 * The local Provider of the research-report seam: assembles the filesystem
 * evidence ledger, the byte-level verifier, the optional numeric bridge, and
 * the sealing renderer into the `ctx.researchReport` service implementation.
 * @module dsh-research-report/provider-local
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { JobHooks, JobOutcome } from '@deepseek-ai/dsh-jobs'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import type { WebRuntime } from '@deepseek-ai/dsh-web'
import {
  buildManifest,
  configFingerprint,
  renderReportMarkdown,
  serializeDisconfirmationJournal,
  serializeManifest,
  serializeVerificationJournal,
  slugify,
  validateAssembleRequest,
  versionIdOf,
} from './assemble.ts'
import type { DisconfirmationEntry, ReportPlan, VerificationEntry } from './assemble.ts'
import type { ResolvedConfig } from './config.ts'
import { isDoiOrigin, validateDoi } from './doi.ts'
import { captureSnapshot, gatherCandidates } from './gather.ts'
import type { CaptureDeps, GatherOutcome } from './gather.ts'
import { EvidenceLedger, LedgerError, sha256Of } from './ledger.ts'
import { ResearchReportService } from './service.ts'
import type {
  AddEvidenceInput,
  AssembleContext,
  AssembleReportDetail,
  AssembleReportRequest,
  AssembleReportResult,
  ClaimRegistration,
  ClaimVerdict,
  ClaimView,
  EvidenceIntegrity,
  EvidenceRecord,
  EvidenceView,
  LedgerSummary,
  SessionRef,
} from './service.ts'
import { combineOutcomes, mapBridgeResults, verifyClaimText } from './verify.ts'
import type { DataQualityBridge } from './verify.ts'
import { renderMachineCheckMarkdown, verifySealedReport as runSealedVerification } from './verify-sealed.ts'
import type { SealedVerificationResult } from './verify-sealed.ts'
import { VERSION } from './version.ts'

/** A loud provider failure with a machine-routable code. */
export class ResearchReportError extends Error {
  /** The machine-routable failure code. */
  readonly code: 'EVIDENCE_TOO_LARGE' | 'CLAIM_UNKNOWN' | 'LEDGER' | 'INVALID_DOI' | 'MISSING_JOURNAL_METADATA' | 'INVALID_SESSION_REF'
  constructor(code: ResearchReportError['code'], message: string) {
    super(message)
    this.name = 'ResearchReportError'
    this.code = code
  }
}

/**
 * A fail-loud pre-seal interception: the pre-delivery re-audit surfaced hard
 * failure signals (verdict drift, tampered/missing bound evidence, or an
 * audit-journal serialization failure), so the report is not sealed.
 */
export class SealBlockedError extends Error {
  /** The machine-routable failure code. */
  readonly code = 'SEAL_BLOCKED'
  /** The concrete blocking reasons. */
  readonly reasons: string[]
  constructor(reasons: string[]) {
    super(`seal blocked: ${reasons.join('; ')}`)
    this.name = 'SealBlockedError'
    this.reasons = reasons
  }
}

/**
 * The rc.2/rc.1 persistence layer still refuses a session log carrying an event
 * type it does not know (unless the event carries the envelope's `ignorable`
 * marker, which live `Session.append` does not expose), and rc.1 offers no
 * plugin event-registration surface — so the research-report/* events are
 * appended only when the host build already knows them. The ledger journals
 * are always the durable source of truth; these events are the in-log audit
 * mirror and activate automatically once the host learns the vocabulary.
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
 * Project one full-vocabulary verdict onto the frozen three-state result item.
 * `insufficient` folds to `unverified` and `disproven` folds to `contradicted`
 * for the cross-plugin surface (sibling plugins only read the frozen
 * three-state vocabulary); the richer verdict stays available in the manifest
 * and the in-package detail result.
 * @param verdict - the full verdict.
 * @returns the frozen result item.
 */
function projectFrozenVerdict(verdict: ClaimVerdict): AssembleReportResult['verdicts'][number] {
  if (verdict.status === 'insufficient') {
    return {
      claimId: verdict.claimId,
      status: 'unverified',
      ...(verdict.note === undefined
        ? { note: 'insufficient evidence' }
        : { note: `insufficient evidence: ${verdict.note}` }),
    }
  }
  if (verdict.status === 'disproven') {
    return {
      claimId: verdict.claimId,
      status: 'contradicted',
      ...(verdict.note === undefined ? { note: 'disproven' } : { note: `disproven: ${verdict.note}` }),
    }
  }
  return {
    claimId: verdict.claimId,
    status: verdict.status,
    ...(verdict.note === undefined ? {} : { note: verdict.note }),
  }
}

/** Order-independent comparison of evidence object hash sets. */
function sameEvidenceSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((hash, index) => hash === sortedB[index])
}

/**
 * Serialize one audit journal defensively. A serialization failure is a hard
 * pre-seal signal — it appends to the block reasons and throws
 * {@link SealBlockedError} rather than being silently skipped.
 * @param serialize - the journal serializer thunk.
 * @param label - the journal name for the block reason.
 * @param blockedReasons - the accumulating block reasons.
 * @returns the serialized journal text.
 */
function serializeJournalOrThrow(serialize: () => string, label: string, blockedReasons: string[]): string {
  try {
    return serialize()
  } catch (error) {
    blockedReasons.push(`${label} serialization failed: ${error instanceof Error ? error.message : String(error)}`)
    throw new SealBlockedError(blockedReasons)
  }
}

/** The optional jobs seam surface (resolved at call time, never injected). */
interface JobsRuntime {
  start(input: { kind: string; label: string; run: () => JobHooks }): string
}

/**
 * Validate a sessionRef anchor. A malformed anchor is a loud registration
 * failure — session-anchored evidence must point at a real, ordered log range.
 * @param ref - the anchor to validate.
 */
function validateSessionRef(ref: SessionRef): void {
  if (typeof ref.sessionId !== 'string' || ref.sessionId.trim() === '') {
    throw new ResearchReportError('INVALID_SESSION_REF', 'sessionRef.sessionId must be a non-empty string')
  }
  const { start, end } = ref.eventRange
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw new ResearchReportError(
      'INVALID_SESSION_REF',
      `sessionRef.eventRange must be a non-negative [start, end] range with start <= end, got [${String(start)}, ${String(end)}]`,
    )
  }
}

/**
 * Start the read-only verifier job: re-run the deterministic sealed-report
 * verification and append the model-review section to `verifier-note.md`. The
 * model review is an enhancement over the always-run machine check.
 * @param service - the provider (for `verifySealedReport`).
 * @param reportDir - the sealed report directory.
 * @param expectedSealHash - the seal hash to recompute against.
 * @param notePath - the `verifier-note.md` path to append to.
 * @returns the job hooks.
 */
function startVerifierJob(
  service: LocalResearchReportService,
  reportDir: string,
  expectedSealHash: string,
  notePath: string,
): JobHooks {
  const done = Promise.withResolvers<JobOutcome>()
  let settled = false
  const settle = (outcome: JobOutcome): void => {
    if (settled) return
    settled = true
    done.resolve(outcome)
  }
  void service.verifySealedReport(reportDir, expectedSealHash)
    .then(async (result) => {
      const review = [
        '',
        '### Re-verification (read-only, deterministic)',
        '',
        'Model review is an enhancement over the machine check above; this re-run',
        'recomputes the same deterministic verification from the sealed directory.',
        '',
        '```',
        renderMachineCheckMarkdown(result),
        '```',
        '',
      ].join('\n')
      await appendFile(notePath, review, 'utf8')
      settle({ status: 'completed', detail: 'verifier note appended', output: review })
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      settle({ status: 'failed', detail: message.length > 200 ? `${message.slice(0, 197)}…` : message })
    })
  return {
    cancel(reason?: string): void {
      settle({ status: 'killed', detail: `cancelled: ${reason ?? 'no reason given'}` })
    },
    done: done.promise,
    readOutput: (): string => '',
  }
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
   * same-content registrations dedupe. DOI-typed origins are validated
   * deterministically (zero network) and, when `requireJournalMetadata` is on,
   * must carry journal + year.
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
    if (isDoiOrigin(input.origin)) {
      const validation = validateDoi(input.origin)
      if (!validation.valid) {
        throw new ResearchReportError('INVALID_DOI', `invalid DOI: ${validation.reason}`)
      }
      if (this.config.requireJournalMetadata && (input.journal === undefined || input.journal.trim() === '' || input.year === undefined || input.year.trim() === '')) {
        throw new ResearchReportError(
          'MISSING_JOURNAL_METADATA',
          `DOI evidence "${input.origin}" requires a journal name and publication year (requireJournalMetadata is enabled)`,
        )
      }
    }
    if (input.sessionRef !== undefined) {
      validateSessionRef(input.sessionRef)
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
        ...(input.journal === undefined ? {} : { journal: input.journal }),
        ...(input.year === undefined ? {} : { year: input.year }),
        ...(input.sessionRef === undefined ? {} : { sessionRef: input.sessionRef }),
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
    // DOI evidence is validated offline; it is never fetched. A DOI origin
    // without inline content is refused instead of hitting the network seam.
    if (isDoiOrigin(origin)) {
      throw new ResearchReportError(
        'INVALID_DOI',
        `DOI evidence requires inline content (zero-network DOI validation); pass content with the DOI as origin`,
      )
    }
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
    const sessionAnchored: string[] = []
    for (const evidenceId of claim.evidenceIds) {
      const record = await this.ledger.getEvidence(evidenceId)
      if (record?.sessionRef !== undefined) {
        sessionAnchored.push(`${evidenceId} → session ${record.sessionRef.sessionId} [${record.sessionRef.eventRange.start}-${record.sessionRef.eventRange.end}]`)
      }
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
    if (sessionAnchored.length > 0) {
      byte = {
        status: 'unverified' as const,
        note: `会话锚定证据需人工回查会话日志 (session-anchored evidence requires manual session-log review): ${sessionAnchored.join('; ')}`,
        missing: [],
        contradictions: [],
      }
    } else if (broken.length > 0) {
      byte = {
        status: 'contradicted' as const,
        note: `bound evidence failed the integrity check: ${broken.join('; ')}`,
        missing: [],
        contradictions: broken,
      }
    } else {
      byte = verifyClaimText(claim.text, contents)
    }

    let bridge: { status: 'verified' | 'unverified' | 'disproven'; note: string } | undefined
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
   * Assemble and seal one report over the frozen cross-plugin surface. The
   * three-state verdict vocabulary is preserved for sibling plugins: an
   * `insufficient` claim folds to `unverified` here (the richer verdict stays
   * in the manifest and the in-package detail result).
   * @param request - the frozen assemble request.
   * @param context - optional assemble context (owning session for events).
   * @returns the sealed directory, the seal hash, and the three-state verdicts.
   */
  async assemble(request: AssembleReportRequest, context?: AssembleContext): Promise<AssembleReportResult> {
    const detail = await this.assembleDetailed(request, context)
    return {
      reportDir: detail.reportDir,
      sealHash: detail.sealHash,
      verdicts: detail.verdicts.map(projectFrozenVerdict),
    }
  }

  /**
   * Assemble and seal one report with the full in-package result. Before
   * delivery every bound claim is re-audited offline against the current
   * snapshot bytes (same byte-level + numeric-bridge mechanism as `verifyClaim`),
   * the re-audit is journaled to `verification.jsonl`, falsified claims are
   * journaled to `disconfirmation.jsonl`, and a claim whose stored verdict was
   * `verified` but whose re-audit no longer confirms is marked `contradicted`
   * (drift) and counted in the report summary.
   * @param request - the frozen assemble request.
   * @param context - optional assemble context (owning session for events).
   * @returns the sealed directory, the seal hash, the full verdicts, and the drift count.
   */
  async assembleDetailed(request: AssembleReportRequest, context?: AssembleContext): Promise<AssembleReportDetail> {
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

    const generatedAt = new Date().toISOString()
    const evidenceHashById = new Map(records.map(record => [record.id, record.hash]))
    const evidenceRecordById = new Map(records.map(record => [record.id, record]))
    const requestClaimById = new Map(request.claims.map(claim => [claim.id, claim]))
    const priorByClaim = await this.ledger.latestVerdicts()
    const priorDisproofs = await this.ledger.latestDisproofs()

    const verdicts: ClaimVerdict[] = []
    const verificationEntries: VerificationEntry[] = []
    const driftedClaims: string[] = []
    let driftCount = 0
    for (const claim of request.claims) {
      const registration = await this.ledger.getClaim(claim.id)
      if (registration === undefined) {
        throw new ResearchReportError('CLAIM_UNKNOWN', `unknown claim id "${claim.id}"`)
      }
      const claimHash = sha256Of(registration.text)
      const evidenceHashes = claim.evidenceIds.map(id => evidenceHashById.get(id)!)
      const sessionRefs = claim.evidenceIds
        .map(id => evidenceRecordById.get(id))
        .filter((record): record is EvidenceRecord => record !== undefined && record.sessionRef !== undefined)
        .map(record => ({ evidenceId: record.id, sessionId: record.sessionRef!.sessionId, eventRange: record.sessionRef!.eventRange }))
      const fresh = await this.verifyRegistration(registration)
      const prior = priorByClaim.get(claim.id)
      const drifted = prior !== undefined && prior.status === 'verified' && fresh.status !== 'verified'
      const priorDisproof = priorDisproofs.get(claimHash)

      // Negative knowledge: the same claim text was previously disproven and
      // its bound evidence has not changed — block re-reporting it as verified.
      let final: ClaimVerdict
      if (priorDisproof !== undefined && sameEvidenceSet(priorDisproof.evidenceHashes, evidenceHashes) && fresh.status === 'verified') {
        final = {
          claimId: claim.id,
          status: 'disproven',
          note: `previously disproven against unchanged evidence: ${priorDisproof.note}`,
        }
      } else if (drifted) {
        final = { claimId: claim.id, status: 'contradicted', note: `drift from prior verified verdict: ${fresh.note}` }
      } else {
        final = fresh
      }

      if (drifted) {
        driftCount += 1
        driftedClaims.push(claim.id)
      }
      await this.ledger.recordVerdict(
        { claimId: final.claimId, status: final.status, ...(final.note === undefined ? {} : { note: final.note }) },
        generatedAt,
      )
      appendAudit(context?.session, 'research-report/verify', () => {
        context?.session?.append('research-report/verify', {
          claimId: final.claimId,
          status: final.status,
          ...(final.note === undefined ? {} : { note: final.note }),
          evidenceIds: registration.evidenceIds,
        })
      })
      verdicts.push(final)
      verificationEntries.push({
        claimId: claim.id,
        claimHash,
        evidenceHashes,
        at: generatedAt,
        status: fresh.status,
        priorStatus: prior?.status ?? null,
        drifted,
        ...(sessionRefs.length === 0 ? {} : { sessionRefs }),
      })

      // Record negative knowledge whenever the re-audit explicitly falsifies
      // the claim against its evidence content.
      if (fresh.status === 'disproven') {
        await this.ledger.recordDisproof(
          {
            claimHash,
            claimId: claim.id,
            text: registration.text,
            evidenceHashes: [...evidenceHashes].sort(),
            note: fresh.note ?? 'disproven',
          },
          generatedAt,
        )
      }
    }

    const disconfirmationEntries: DisconfirmationEntry[] = verdicts
      .filter(verdict => verdict.status === 'contradicted' || verdict.status === 'disproven')
      .map(verdict => {
        const claim = requestClaimById.get(verdict.claimId)!
        return {
          claimId: verdict.claimId,
          claimHash: sha256Of(claim.text),
          evidenceIds: claim.evidenceIds,
          evidenceHashes: claim.evidenceIds.map(id => evidenceHashById.get(id)!),
          at: generatedAt,
          status: verdict.status === 'disproven' ? 'disproven' as const : 'contradicted' as const,
          note: verdict.note ?? '',
        }
      })

    // Pre-seal interception: hard re-audit signals block delivery. No tunable —
    // tampering, regression, or an un-journalable audit is never silently sealed.
    const blockedReasons: string[] = []
    if (driftedClaims.length > 0) {
      blockedReasons.push(`verdict drift: ${driftedClaims.map(id => `claim "${id}"`).join(', ')} regressed from a prior verified verdict`)
    }
    const integrityFailures: string[] = []
    for (const record of records) {
      const read = await this.ledger.readContent(record.id)
      if (read !== undefined && read.integrity !== 'ok') {
        integrityFailures.push(`evidence "${record.id}" is ${read.integrity}`)
      }
    }
    if (integrityFailures.length > 0) {
      blockedReasons.push(`bound evidence integrity failure: ${integrityFailures.join('; ')}`)
    }
    const verificationText = serializeJournalOrThrow(
      () => serializeVerificationJournal(verificationEntries),
      'verification journal',
      blockedReasons,
    )
    const disconfirmationText = serializeJournalOrThrow(
      () => serializeDisconfirmationJournal(disconfirmationEntries),
      'disconfirmation journal',
      blockedReasons,
    )
    if (blockedReasons.length > 0) {
      throw new SealBlockedError(blockedReasons)
    }

    const fingerprint = configFingerprint(this.config)
    const plan: ReportPlan = {
      request,
      verdicts,
      evidence: records,
      generatedAt,
      fingerprint,
      pluginVersion: VERSION,
      driftCount,
      ...(verificationEntries.length === 0
        ? {}
        : { verification: { file: 'verification.jsonl', sha256: sha256Of(verificationText), entries: verificationEntries.length } }),
      ...(disconfirmationEntries.length === 0
        ? {}
        : { disconfirmation: { file: 'disconfirmation.jsonl', sha256: sha256Of(disconfirmationText), entries: disconfirmationEntries.length } }),
    }
    const reportText = renderReportMarkdown(plan)
    const manifestText = serializeManifest(buildManifest(plan, sha256Of(reportText)))
    const sealHash = sha256Of(manifestText)

    const reportDir = await this.freshReportDir(request.topic, new Date(generatedAt))
    await writeFile(path.join(reportDir, 'report.md'), reportText, 'utf8')
    await writeFile(path.join(reportDir, 'manifest.json'), manifestText, 'utf8')
    await writeFile(path.join(reportDir, 'verification.jsonl'), verificationText, 'utf8')
    await writeFile(path.join(reportDir, 'disconfirmation.jsonl'), disconfirmationText, 'utf8')

    // Read-only verifier: the deterministic machine check always runs and is
    // written first; the optional model-review job is an enhancement.
    const machineResult = await this.verifySealedReport(reportDir, sealHash)
    const notePath = path.join(reportDir, 'verifier-note.md')
    const modelStatus = this.spawnVerifier(reportDir, sealHash, notePath)
    const verifierNote = [
      '# Verifier note',
      '',
      '## Machine check (deterministic)',
      '',
      renderMachineCheckMarkdown(machineResult),
      '',
      '## Model review (read-only)',
      '',
      modelStatus,
      '',
    ].join('\n')
    await writeFile(notePath, verifierNote, 'utf8')

    appendAudit(context?.session, 'research-report/seal', () => {
      context?.session?.append('research-report/seal', {
        reportDir,
        sealHash,
        topic: request.topic,
        title: request.title,
        verdicts,
      })
    })
    return { reportDir, sealHash, verdicts, driftCount }
  }

  /**
   * Spawn the optional read-only verifier job over `ctx.jobs`; return the
   * model-review status line written into `verifier-note.md`. Without a jobs
   * seam the model review is skipped gracefully (the machine check still ran).
   * @param reportDir - the sealed report directory.
   * @param expectedSealHash - the seal hash to recompute against.
   * @param notePath - the `verifier-note.md` path the job appends to.
   * @returns the status line.
   */
  private spawnVerifier(reportDir: string, expectedSealHash: string, notePath: string): string {
    const jobs = this.ctx.get('jobs') as JobsRuntime | undefined
    if (jobs === undefined) {
      return 'verifier: skipped (jobs unavailable)'
    }
    const jobId = jobs.start({
      kind: 'research-report-verify',
      label: `verify sealed report: ${reportDir}`,
      run: (): JobHooks => startVerifierJob(this, reportDir, expectedSealHash, notePath),
    })
    return `read-only verifier job ${jobId} started (enhancement over the deterministic machine check)`
  }

  /**
   * Deterministically verify a sealed report directory: recompute the seal and
   * audit hashes and re-run the byte-level + integrity claim check. Zero
   * network, zero model — the fallback that always runs at seal time.
   * @param reportDir - the sealed report directory.
   * @param expectedSealHash - the seal hash returned at assemble time.
   * @returns the verification result.
   */
  async verifySealedReport(reportDir: string, expectedSealHash: string): Promise<SealedVerificationResult> {
    return runSealedVerification(reportDir, expectedSealHash, {
      readFile: (file: string) => readFile(file, 'utf8'),
      readEvidenceContent: (id: string) => this.ledger.readContent(id),
    })
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
