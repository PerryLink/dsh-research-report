/**
 * `dsh-research-report` — a domain-agnostic verifiable research-report engine
 * for DeepSeek Harness. A content-addressed evidence ledger (claim ↔ snapshot
 * binding, tamper-evident) plus versioned sealed reports: every claim carries
 * a verification verdict, and the manifest hash seals the report directory.
 * Retrieval orchestration is deliberately NOT re-implemented here — evidence
 * gathering reuses the official `ctx.web` seam and long runs ride `ctx.jobs`.
 *
 * One package carries the complete capability seam: `service.ts` is the
 * Service Definition (`ctx.researchReport`, with the byte-frozen assemble
 * contract), `provider-local.ts` is the local Provider, and `tools/` the
 * model-facing Consumers.
 *
 * Function plugin — no default export (the Loader unwraps
 * `exports.default ?? exports`, and a stray default would discard
 * `name`/`inject`/`Config`/`apply`).
 * @module dsh-research-report
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: registers the `ctx.systemPrompt` Context merge for the inject.
import type {} from '@deepseek-ai/dsh-system-prompt'
import { Config, resolveConfig } from './config.ts'
import { LocalResearchReportService } from './provider-local.ts'
import { makeEvidenceAddTool } from './tools/evidence-add.ts'
import { makeLedgerQueryTool } from './tools/ledger-query.ts'
import { makeResearchReportTool } from './tools/research-report.ts'

export const name = 'research-report'

/**
 * Public services only. `web` (evidence capture) and `jobs` (background
 * assembly) are deliberately OPTIONAL and resolved with `ctx.get` at call
 * time: a composition without them still mounts, and the affected paths fail
 * loud with an explicit reason.
 */
export const inject = ['tools', 'systemPrompt']

export { Config, resolveConfig } from './config.ts'
export type { ResolvedConfig } from './config.ts'
export { VERSION } from './version.ts'
export { ResearchReportService } from './service.ts'
export type {
  AddEvidenceInput,
  AssembleContext,
  AssembleReportDetail,
  AssembleReportRequest,
  AssembleReportResult,
  ClaimRegistration,
  ClaimVerdict,
  ClaimView,
  EvidenceInput,
  EvidenceIntegrity,
  EvidenceRecord,
  EvidenceView,
  LedgerSummary,
  ReportSectionInput,
  SessionRef,
  StoredVerdict,
  VerdictStatus,
} from './service.ts'
export { EvidenceLedger, LedgerError, sha256Of } from './ledger.ts'
export type { LedgerClaimLine, LedgerDisproofLine, LedgerIndexLine, LedgerVerdictLine } from './ledger.ts'
export { isDoiOrigin, normalizeDoi, validateDoi } from './doi.ts'
export type { DoiValidation } from './doi.ts'
export {
  combineOutcomes,
  contextLabelOf,
  extractCitations,
  mapBridgeResults,
  normalizeNumber,
  verifyClaimText,
} from './verify.ts'
export type {
  ByteCheckOutcome,
  Citation,
  CitationCheckRequest,
  CitationCheckResult,
  DataQualityBridge,
} from './verify.ts'
export {
  CONTRADICTED_MARK,
  DISPROVEN_MARK,
  INSUFFICIENT_MARK,
  MANIFEST_SCHEMA,
  RequestValidationError,
  UNVERIFIED_MARK,
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
export type { DisconfirmationEntry, ReportManifest, ReportPlan, VerificationEntry } from './assemble.ts'
export {
  CaptureError,
  GATHER_DEPTH_RESULTS,
  captureFromFile,
  captureFromWeb,
  captureSnapshot,
  gatherCandidates,
  isUrlOrigin,
  resolveWorkspacePath,
  toWorkspaceRelative,
} from './gather.ts'
export type { CaptureDeps, GatherCandidate, GatherOutcome } from './gather.ts'
export { renderMachineCheckMarkdown, verifySealedReport } from './verify-sealed.ts'
export type { SealedVerificationClaim, SealedVerificationDeps, SealedVerificationResult } from './verify-sealed.ts'
export { LocalResearchReportService, ResearchReportError, SealBlockedError } from './provider-local.ts'

/** The short prompt section: one role statement plus the workflow. */
const PROMPT_SECTION = [
  'You have a verifiable research-report engine (dsh-research-report) whose reports prove every claim against stored evidence bytes.',
  'When asked for a research deliverable: register evidence snapshots with evidence_add (URL, DOI, or workspace path; DOI evidence needs inline content plus optional journal/year), then call research_report with sections whose paragraphs cite claim ids bound to those evidence ids. Every claim is verified against the stored snapshot bytes; unverified, insufficient, contradicted, or disproven claims stay visibly marked in the sealed report — never paper over them. ledger_query reads bindings and verdicts back.',
].join('\n')

/**
 * Mount the engine: resolve config (fail loud), construct the local provider
 * (registering `ctx.researchReport` on this fiber), register the three tools,
 * and contribute the short prompt section.
 * @param ctx - the plugin context (host).
 * @param config - raw plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  const logger = ctx.logger('research-report')
  if (!resolved.enabled) {
    logger.info('disabled: enabled is false — no service, tools, or prompt section are mounted')
    return
  }

  // The provider registers itself as ctx.researchReport on construction and
  // is unregistered with this fiber (Service base semantics).
  const service = new LocalResearchReportService(ctx, resolved, process.cwd())

  ctx.effect(() => ctx.tools.register(makeEvidenceAddTool(service)), 'research-report: evidence_add tool')
  ctx.effect(() => ctx.tools.register(makeResearchReportTool({ ctx, service })), 'research-report: research_report tool')
  ctx.effect(() => ctx.tools.register(makeLedgerQueryTool(service)), 'research-report: ledger_query tool')

  ctx.systemPrompt.section({
    name: 'dsh-research-report:workflow',
    order: 10,
    text: PROMPT_SECTION,
  })
}
