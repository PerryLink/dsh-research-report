/**
 * The `research_report` model tool (Consumer): assemble and seal one
 * verifiable report from ledger evidence, or — with `gather: true` — run one
 * search round over `ctx.web` and hand the candidate/gap list back to the
 * model for confirmation (never auto-assembles). Long runs may go to a
 * `research-report` background job over `ctx.jobs`.
 * @module dsh-research-report/tools/research-report
 */

import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { JobHooks, JobOutcome } from '@deepseek-ai/dsh-jobs'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolResult } from '@deepseek-ai/dsh-tools'
import { CaptureError } from '../gather.ts'
import type { LocalResearchReportService } from '../provider-local.ts'
import type {
  AssembleReportRequest,
  ClaimRegistration,
  ClaimVerdict,
  EvidenceInput,
} from '../service.ts'

/** The sealed branch of the canonical value. */
interface SealedValue {
  kind: 'sealed'
  reportDir: string
  reportFile: string
  manifestFile: string
  sealHash: string
  verdicts: ClaimVerdict[]
  counts: { verified: number; unverified: number; contradicted: number }
  evidenceCount: number
}

/** The background branch: the typed job handle. */
interface BackgroundValue {
  kind: 'background'
  jobId: string
}

/** The gathered branch: candidates plus the explicit gap list. */
interface GatheredValue {
  kind: 'gathered'
  topic: string
  candidates: Array<{
    url: string
    title?: string
    snippet?: string
    status: 'captured' | 'uncaptured'
    evidenceId?: string
    reason?: string
  }>
  gaps: string[]
}

/** The `research_report` canonical value. */
export type ResearchReportValue = SealedValue | BackgroundValue | GatheredValue

/** The verdict item schema fragment. */
const verdictSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claimId: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['verified', 'unverified', 'contradicted'] },
    note: { type: 'string' },
  },
} as const

/** The tool's output schema (all three branches). */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', required: true, enum: ['sealed', 'background', 'gathered'] },
    reportDir: { type: 'string' },
    reportFile: { type: 'string' },
    manifestFile: { type: 'string' },
    sealHash: { type: 'string' },
    verdicts: { type: 'array', items: verdictSchema },
    counts: {
      type: 'object',
      additionalProperties: false,
      properties: {
        verified: { type: 'integer', required: true },
        unverified: { type: 'integer', required: true },
        contradicted: { type: 'integer', required: true },
      },
    },
    evidenceCount: { type: 'integer' },
    jobId: { type: 'string' },
    topic: { type: 'string' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          url: { type: 'string', required: true },
          title: { type: 'string' },
          snippet: { type: 'string' },
          status: { type: 'string', required: true, enum: ['captured', 'uncaptured'] },
          evidenceId: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    gaps: { type: 'array', items: { type: 'string' } },
  },
} as const

/** The sections parameter schema fragment. */
const sectionsSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      heading: { type: 'string', required: true },
      paragraphs: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            text: { type: 'string', required: true },
            claimIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
} as const

/** The claims parameter schema fragment (frozen shape + the optional numeric bridge). */
const claimsSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', required: true },
      text: { type: 'string', required: true },
      evidenceIds: { type: 'array', required: true, items: { type: 'string' } },
      dataset: { type: 'string' },
      citations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', required: true },
            path: { type: 'string', required: true },
            value: { oneOf: [{ type: 'number' }, { type: 'string' }], required: true },
            tolerance: { type: 'number' },
          },
        },
      },
    },
  },
} as const

/** Render the sealed branch as model-facing text (gaps/contradictions explicit). */
function renderSealed(value: SealedValue): string {
  const lines = [
    `report sealed: ${value.reportDir}`,
    `seal (sha256 of manifest.json): ${value.sealHash}`,
    `claims: ${value.counts.verified} verified / ${value.counts.unverified} unverified / ${value.counts.contradicted} contradicted (of ${value.verdicts.length}); evidence bound: ${value.evidenceCount}`,
  ]
  const problems = value.verdicts.filter(verdict => verdict.status !== 'verified')
  if (problems.length > 0) {
    lines.push('', 'claims needing attention (visible markers kept in the report body):')
    for (const verdict of problems) {
      lines.push(`- [${verdict.status}] ${verdict.claimId}${verdict.note === undefined ? '' : ` — ${verdict.note}`}`)
    }
  }
  return lines.join('\n')
}

/** Render the canonical value as model-facing text. */
function renderValue(value: ResearchReportValue): { type: 'text'; text: string }[] {
  switch (value.kind) {
    case 'background':
      return [{
        type: 'text',
        text: `started background report job ${value.jobId}; read progress with job_output and stop it with job_kill — the final output names the sealed directory and seal hash`,
      }]
    case 'gathered': {
      const lines = [`gathered ${value.candidates.length} candidate source(s) for "${value.topic}" (nothing assembled yet — confirm the evidence set first):`]
      for (const candidate of value.candidates) {
        lines.push(candidate.status === 'captured'
          ? `- captured ${candidate.evidenceId}: ${candidate.title ?? candidate.url}`
          : `- uncaptured ${candidate.url}: ${candidate.reason ?? 'unknown reason'}`)
      }
      if (value.gaps.length > 0) {
        lines.push('', 'gaps to close:')
        for (const gap of value.gaps) lines.push(`- ${gap}`)
      }
      lines.push('', 'next: call research_report again with evidenceRefs chosen from the captured ids (or add more with evidence_add).')
      return [{ type: 'text', text: lines.join('\n') }]
    }
    case 'sealed':
      return [{ type: 'text', text: renderSealed(value) }]
  }
}

/** Everything the tool needs beyond the provider (the optional jobs seam). */
export interface ResearchReportToolDeps {
  /** The plugin context (for the optional `ctx.jobs` lookup). */
  ctx: Context
  /** The local research-report provider. */
  service: LocalResearchReportService
}

/**
 * Build the `research_report` tool bound to the local provider.
 * @param deps - the plugin context plus the provider.
 * @returns the tool definition.
 */
export function makeResearchReportTool(deps: ResearchReportToolDeps) {
  const { service } = deps
  return defineTool({
    name: 'research_report',
    description: [
      'Assemble and seal a verifiable research report (dsh-research-report).',
      '',
      'Every claim must bind evidence already in the ledger (evidence_add) and is verified against the stored bytes: numbers and quoted spans must be locatable verbatim. The report directory is versioned and sealed (manifest.json + SHA-256 seal hash); unverified or contradicted claims keep a visible [未核实] / [与证据矛盾] marker in the body and are listed in Appendix A — they are never silently passed.',
      '',
      'Optional convenience: set gather: true to run ONE search round over the topic via the harness web capability. Captured snapshots are registered as evidence; the candidate list plus an explicit gap list come back for your confirmation — nothing is assembled automatically.',
      '',
      'Set background: true for a background job (returns a job id; read with job_output, stop with job_kill).',
    ].join('\n'),
    parameters: {
      topic: { type: 'string', required: true, description: 'The research topic (names the versioned report directory).' },
      title: { type: 'string', description: 'Report title (defaults to "Research report: <topic>").' },
      sections: { ...sectionsSchema, description: 'Report body: heading + paragraphs; each paragraph may cite claim ids.' },
      claims: { ...claimsSchema, description: 'Claim registrations: id, text, bound evidence ids, and the optional dataset citation bridge.' },
      evidenceRefs: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ledger evidence ids (from evidence_add / gather) to bind into this report.',
      },
      gather: { type: 'boolean', description: 'Run one search round and return candidates + gaps instead of assembling.' },
      depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Gather depth: quick=3, standard=5, deep=8 sources.' },
      background: { type: 'boolean', description: 'Assemble as a background job (ctx.jobs) and return the job id immediately.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => renderValue(value as ResearchReportValue),
      presentationMeta: (_args, value) => {
        const result = value as ResearchReportValue
        return result.kind === 'sealed' ? sealedMeta(result) : {}
      },
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted()
      const session = exec.agent?.session

      if (args.gather === true) {
        const outcome = await service.gather(args.topic, args.depth ?? 'standard', exec.signal, session)
        return {
          kind: 'gathered' as const,
          topic: outcome.topic,
          candidates: outcome.candidates,
          gaps: outcome.gaps,
        }
      }

      const request = await buildRequest(service, args)
      if (args.background === true) {
        const jobs = deps.ctx.get('jobs')
        if (jobs === undefined) {
          throw new Error('background jobs unavailable: this composition mounts no ctx.jobs (load @deepseek-ai/dsh-jobs-local and @deepseek-ai/dsh-tool-jobs), or call without background')
        }
        if (exec.signal.aborted) throw new Error('tool call aborted')
        const jobId = jobs.start({
          kind: 'research-report',
          label: `assemble report: ${args.topic}`,
          ...exec.agent === undefined ? {} : { owner: exec.agent },
          run: (): JobHooks => startAssembleJob(service, request, session === undefined ? {} : { session }),
        })
        return { kind: 'background' as const, jobId }
      }

      const result = await service.assemble(request, session === undefined ? {} : { session })
      return sealedValue(result.reportDir, result.sealHash, result.verdicts, request.evidence.length)
    },
    presentCall: (args) => {
      const topic = (args as { topic?: unknown }).topic
      return { card: 'generic' as const, title: `Research report: ${typeof topic === 'string' ? topic : ''}` }
    },
    presentResult: (_args, result: ToolResult) => {
      // The sealed report files are the deliverables: declare the edit intent
      // and the produced paths so the UI lists them (replay-safe: the paths
      // ride the persisted presentation meta, not any live state).
      const meta = result.meta as { reportFile?: string; manifestFile?: string } | undefined
      if (meta?.reportFile === undefined || meta.manifestFile === undefined) return undefined
      return {
        card: 'generic' as const,
        title: 'Sealed research report',
        kind: 'edit',
        locations: [{ path: meta.reportFile }, { path: meta.manifestFile }],
      }
    },
  })
}

/** The durable presentation projection (report file paths for the UI card). */
function sealedMeta(value: SealedValue): { reportFile: string; manifestFile: string } {
  return { reportFile: value.reportFile, manifestFile: value.manifestFile }
}

/** Shape the sealed canonical value. */
function sealedValue(reportDir: string, sealHash: string, verdicts: ClaimVerdict[], evidenceCount: number): SealedValue {
  const counts = { verified: 0, unverified: 0, contradicted: 0 }
  for (const verdict of verdicts) counts[verdict.status] += 1
  return {
    kind: 'sealed',
    reportDir,
    reportFile: path.join(reportDir, 'report.md'),
    manifestFile: path.join(reportDir, 'manifest.json'),
    sealHash,
    verdicts,
    counts,
    evidenceCount,
  }
}

/** The args view the execute body consumes (post-validation). */
interface ReportArgs {
  topic: string
  title?: string
  sections?: AssembleReportRequest['sections']
  claims?: ClaimRegistration[]
  evidenceRefs?: string[]
  gather?: boolean
  depth?: 'quick' | 'standard' | 'deep'
  background?: boolean
}

/**
 * Build the frozen assemble request from the tool args: resolve evidenceRefs
 * through the ledger (unknown ids fail loud) and default the title.
 * @param service - the local provider.
 * @param args - the validated tool args.
 * @returns the assemble request.
 */
async function buildRequest(service: LocalResearchReportService, args: ReportArgs): Promise<AssembleReportRequest> {
  const refs = args.evidenceRefs ?? []
  const evidence: EvidenceInput[] = []
  for (const ref of refs) {
    const record = await service.getEvidence(ref)
    const read = await service.readEvidenceContent(ref)
    if (record === undefined || read === undefined) {
      throw new Error(`unknown evidence id "${ref}" in evidenceRefs — register it with evidence_add first`)
    }
    evidence.push({
      id: record.id,
      title: record.title,
      origin: record.origin,
      content: read.content,
      capturedAt: record.capturedAt,
    })
  }
  return {
    title: args.title ?? `Research report: ${args.topic}`,
    topic: args.topic,
    evidence,
    sections: args.sections ?? [],
    claims: args.claims ?? [],
  }
}

/**
 * Start the background assemble job body. The job owns its cancellation
 * signal; settlement flushes the sealed summary into the job output.
 * @param service - the local provider.
 * @param request - the frozen assemble request.
 * @param context - the assemble context (owning session, when known).
 * @returns the job hooks.
 */
function startAssembleJob(
  service: LocalResearchReportService,
  request: AssembleReportRequest,
  context: { session?: import('@deepseek-ai/dsh-session').Session },
): JobHooks {
  const abort = new AbortController()
  const progress: string[] = [`assembling report: ${request.topic}`]
  const done = Promise.withResolvers<JobOutcome>()
  let settled = false
  const settle = (outcome: JobOutcome): void => {
    if (settled) return
    settled = true
    done.resolve(outcome)
  }
  void service.assemble(request, context)
    .then((result) => {
      const value = sealedValue(result.reportDir, result.sealHash, result.verdicts, request.evidence.length)
      progress.push(renderSealed(value))
      settle({ status: 'completed', detail: `sealed ${result.sealHash.slice(0, 12)}`, output: renderSealed(value) })
    })
    .catch((error: unknown) => {
      const message = error instanceof CaptureError || error instanceof Error ? error.message : String(error)
      progress.push(`assemble failed: ${message}`)
      settle({ status: 'failed', detail: message.length > 200 ? `${message.slice(0, 197)}…` : message })
    })
  return {
    cancel(reason?: string): void {
      abort.abort(reason ?? 'cancelled')
      settle({ status: 'killed', detail: `cancelled: ${reason ?? 'no reason given'}` })
    },
    done: done.promise,
    readOutput: (): string => {
      if (progress.length === 0) return ''
      return `${progress.splice(0, progress.length).join('\n')}\n`
    },
  }
}

// `sealedMeta` feeds `output.presentationMeta`: the durable, replay-safe
// projection the UI card reads back from `tool/result.meta`.
export { sealedMeta }
