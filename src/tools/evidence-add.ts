/**
 * The `evidence_add` model tool (Consumer): register one evidence snapshot in
 * the ledger. `content` given inline is used verbatim; absent, the origin is
 * captured — a URL through the `ctx.web` seam, a workspace path from disk.
 * @module dsh-research-report/tools/evidence-add
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { CaptureError } from '../gather.ts'
import { ResearchReportError } from '../provider-local.ts'
import type { LocalResearchReportService } from '../provider-local.ts'

/** The canonical success value. */
interface EvidenceAddSuccess {
  ok: true
  evidenceId: string
  hash: string
  bytes: number
  title: string
  origin: string
  capturedAt: string
  deduplicated: boolean
}

/** The canonical domain-failure value (capability absence still throws). */
interface EvidenceAddFailure {
  ok: false
  error: { code: string; message: string }
}

/** The `evidence_add` canonical value. */
export type EvidenceAddValue = EvidenceAddSuccess | EvidenceAddFailure

/** The tool's output schema (both branches). */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    evidenceId: { type: 'string' },
    hash: { type: 'string' },
    bytes: { type: 'integer' },
    title: { type: 'string' },
    origin: { type: 'string' },
    capturedAt: { type: 'string' },
    deduplicated: { type: 'boolean' },
    error: {
      type: 'object',
      additionalProperties: false,
      properties: {
        code: { type: 'string', required: true },
        message: { type: 'string', required: true },
      },
    },
  },
} as const

/**
 * Build the `evidence_add` tool bound to the local provider.
 * @param service - the local research-report provider.
 * @returns the tool definition.
 */
export function makeEvidenceAddTool(service: LocalResearchReportService) {
  return defineTool({
    name: 'evidence_add',
    description: [
      'Register one evidence snapshot in the verifiable research ledger (dsh-research-report).',
      '',
      'Pass `content` inline when you already hold the text; otherwise the origin is captured for you — a URL is fetched through the harness web capability (ctx.web), a workspace-relative path is read from disk. Snapshots are content-addressed and immutable: the same content is stored once, and any later byte change is detected as tampering during verification.',
      '',
      'Returns the evidence id and its SHA-256 hash. Bind the id to claims in research_report.',
    ].join('\n'),
    parameters: {
      origin: {
        type: 'string',
        required: true,
        description: 'Where the evidence comes from: an http(s) URL, a DOI (10.xxxx/xxxx), or a workspace-relative path.',
      },
      content: {
        type: 'string',
        description: 'The verbatim snapshot text. When omitted, the origin is captured (URL fetched / file read); DOI evidence requires inline content.',
      },
      title: {
        type: 'string',
        description: 'Display title (defaults to the origin).',
      },
      journal: {
        type: 'string',
        description: 'Journal name (optional; required for DOI evidence when requireJournalMetadata is enabled).',
      },
      year: {
        type: 'string',
        description: 'Publication year (optional; required for DOI evidence when requireJournalMetadata is enabled).',
      },
      sessionRef: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string', required: true, description: 'The session whose log holds the source events.' },
          eventRange: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              start: { type: 'integer', required: true, description: 'Inclusive start event index.' },
              end: { type: 'integer', required: true, description: 'Inclusive end event index (>= start).' },
            },
          },
        },
        description: 'Optional session-event anchor (sessionId + eventRange); session-anchored evidence verifies as unverified (manual session-log review).',
      },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as EvidenceAddValue
        if (!result.ok) {
          return [{ type: 'text', text: `evidence_add failed (${result.error.code}): ${result.error.message}` }]
        }
        return [{
          type: 'text',
          text: `evidence registered: ${result.evidenceId}${result.deduplicated ? ' (already stored — deduplicated)' : ''}\nsha256: ${result.hash}\norigin: ${result.origin}\nbytes: ${result.bytes}`,
        }]
      },
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted()
      const session = exec.agent?.session
      try {
        const added = args.content !== undefined
          ? await service.addEvidence(
            {
              title: args.title ?? args.origin,
              origin: args.origin,
              content: args.content,
              ...(args.journal === undefined ? {} : { journal: args.journal }),
              ...(args.year === undefined ? {} : { year: args.year }),
              ...(args.sessionRef === undefined ? {} : { sessionRef: args.sessionRef }),
            },
            session,
          )
          : await service.captureAndRegister(args.origin, args.title, exec.signal, session)
        return {
          ok: true as const,
          evidenceId: added.record.id,
          hash: added.record.hash,
          bytes: added.record.bytes,
          title: added.record.title,
          origin: added.record.origin,
          capturedAt: added.record.capturedAt,
          deduplicated: added.deduplicated,
        }
      } catch (error) {
        // The web capability being absent for a URL origin is a deployment
        // fact: fail loudly (isError) so the model stops retrying URLs.
        if (error instanceof CaptureError && error.code === 'WEB_UNAVAILABLE') throw error
        if (error instanceof CaptureError || error instanceof ResearchReportError) {
          return { ok: false as const, error: { code: error.code, message: error.message } }
        }
        throw error
      }
    },
  })
}
