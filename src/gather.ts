/**
 * Evidence capture: URL snapshots via the `ctx.web` seam, workspace file
 * snapshots via `node:fs` — never a direct `fetch` (provider selection and the
 * WebError taxonomy stay with the seam), never a path outside the workspace.
 * @module dsh-research-report/gather
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { WebRuntime } from '@deepseek-ai/dsh-web'

/** Capture failure codes surfaced to the tools layer. */
export type CaptureErrorCode =
  | 'WEB_UNAVAILABLE'
  | 'FETCH_FAILED'
  | 'FETCH_STATUS'
  | 'FETCH_TIMEOUT'
  | 'ORIGIN_UNREADABLE'
  | 'ORIGIN_OUTSIDE_WORKSPACE'

/** A loud capture failure with a machine-routable code (also in the message). */
export class CaptureError extends Error {
  /** The machine-routable failure code. */
  readonly code: CaptureErrorCode
  constructor(code: CaptureErrorCode, message: string) {
    super(`[${code}] ${message}`)
    this.name = 'CaptureError'
    this.code = code
  }
}

/** Whether the origin is an HTTP(S) URL (vs a workspace path). */
export function isUrlOrigin(origin: string): boolean {
  return /^https?:\/\//iu.test(origin)
}

/** Everything the capture paths need. */
export interface CaptureDeps {
  /** The web seam, when the composition mounts it. */
  web: WebRuntime | undefined
  /** Fetch deadline (ms). */
  fetchTimeoutMs: number
  /** Absolute workspace root; local reads never escape it. */
  workspaceRoot: string
}

/** One captured snapshot. */
export interface CapturedSnapshot {
  /** The verbatim snapshot bytes as UTF-8 text. */
  content: string
  /** The effective origin (final URL after redirects, or the workspace-relative path). */
  origin: string
}

/**
 * Resolve a workspace-relative origin to an absolute path inside the
 * workspace. Both sides are resolved before comparison (Windows backslash
 * trap) and the prefix check is segment-aware.
 * @param workspaceRoot - absolute workspace root.
 * @param origin - the workspace-relative (or absolute) origin.
 * @returns the absolute in-workspace path.
 */
export function resolveWorkspacePath(workspaceRoot: string, origin: string): string {
  const root = path.resolve(workspaceRoot)
  const resolved = path.resolve(root, origin)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new CaptureError('ORIGIN_OUTSIDE_WORKSPACE', `origin ${JSON.stringify(origin)} resolves outside the workspace`)
  }
  return resolved
}

/** Relativize an absolute in-workspace path for display/durable records. */
export function toWorkspaceRelative(workspaceRoot: string, absolute: string): string {
  const relative = path.relative(path.resolve(workspaceRoot), path.resolve(absolute))
  return relative.split(path.sep).join('/')
}

/**
 * Capture one URL snapshot through the web seam.
 * @param deps - web seam, deadline, workspace root.
 * @param url - the URL to fetch.
 * @param signal - caller cancellation.
 * @returns the snapshot (throws {@link CaptureError} on every failure).
 */
export async function captureFromWeb(deps: CaptureDeps, url: string, signal?: AbortSignal): Promise<CapturedSnapshot> {
  if (deps.web === undefined) {
    throw new CaptureError(
      'WEB_UNAVAILABLE',
      'the web capability (ctx.web) is not mounted in this composition; pass `content` explicitly or load @deepseek-ai/dsh-web with a fetch provider',
    )
  }
  const timeout = AbortSignal.timeout(deps.fetchTimeoutMs)
  const linked = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  let result
  try {
    result = await deps.web.fetch({ url }, linked)
  } catch (error) {
    if (timeout.aborted && (signal === undefined || !signal.aborted)) {
      throw new CaptureError('FETCH_TIMEOUT', `fetch of ${url} exceeded the configured fetchTimeoutMs ${deps.fetchTimeoutMs}`)
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new CaptureError('FETCH_FAILED', `fetch of ${url} failed: ${message}`)
  }
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new CaptureError('FETCH_STATUS', `fetch of ${url} returned HTTP ${result.statusCode}; no snapshot captured`)
  }
  return { content: result.body.content, origin: result.url }
}

/**
 * Capture one workspace file snapshot.
 * @param deps - workspace root (the web fields are unused here).
 * @param origin - the workspace-relative path.
 * @returns the snapshot (throws {@link CaptureError} when unreadable).
 */
export async function captureFromFile(deps: CaptureDeps, origin: string): Promise<CapturedSnapshot> {
  const absolute = resolveWorkspacePath(deps.workspaceRoot, origin)
  let content: string
  try {
    content = await readFile(absolute, 'utf8')
  } catch (error) {
    throw new CaptureError('ORIGIN_UNREADABLE', `cannot read ${JSON.stringify(origin)}: ${(error as Error).message}`)
  }
  return { content, origin: toWorkspaceRelative(deps.workspaceRoot, absolute) }
}

/**
 * Capture one snapshot from any supported origin.
 * @param deps - web seam, deadline, workspace root.
 * @param origin - URL or workspace path.
 * @param signal - caller cancellation.
 * @returns the snapshot.
 */
export async function captureSnapshot(deps: CaptureDeps, origin: string, signal?: AbortSignal): Promise<CapturedSnapshot> {
  return isUrlOrigin(origin) ? captureFromWeb(deps, origin, signal) : captureFromFile(deps, origin)
}

// ── Topic gathering (the optional `gather: true` convenience) ───────────────

/** Search depth → how many sources are fetched for snapshot capture. */
export const GATHER_DEPTH_RESULTS = { quick: 3, standard: 5, deep: 8 } as const

/** The gather depth knob. */
export type GatherDepth = keyof typeof GATHER_DEPTH_RESULTS

/** One gathered source and whether its snapshot landed in the ledger. */
export interface GatherCandidate {
  /** The source URL. */
  url: string
  /** Provider title, when given. */
  title?: string
  /** Provider snippet, when given. */
  snippet?: string
  /** `captured` entries carry the ledger evidence id. */
  status: 'captured' | 'uncaptured'
  /** Ledger evidence id (captured only). */
  evidenceId?: string
  /** Why the snapshot could not be captured (uncaptured only). */
  reason?: string
}

/** The gather outcome: candidates plus an explicit gap list for the model. */
export interface GatherOutcome {
  /** The searched topic. */
  topic: string
  /** Every source the search returned, with capture status. */
  candidates: GatherCandidate[]
  /** Explicit gaps the model should close before assembling. */
  gaps: string[]
}

/**
 * Run one search over the topic and capture snapshots for the top sources.
 * Captured snapshots are registered through `register`; uncaptured sources
 * land in the gap list with their reason — gathering never fabricates
 * evidence and never auto-assembles.
 * @param deps - web seam, deadline, workspace root.
 * @param topic - the research topic.
 * @param depth - quick | standard | deep.
 * @param signal - caller cancellation.
 * @param register - ledger registration callback for captured snapshots.
 * @returns candidates plus gaps.
 */
export async function gatherCandidates(
  deps: CaptureDeps,
  topic: string,
  depth: GatherDepth,
  signal: AbortSignal | undefined,
  register: (input: { title: string; origin: string; content: string }) => Promise<{ id: string }>,
): Promise<GatherOutcome> {
  if (deps.web === undefined) {
    throw new CaptureError(
      'WEB_UNAVAILABLE',
      'the web capability (ctx.web) is not mounted in this composition; gather needs @deepseek-ai/dsh-web with a search provider',
    )
  }
  const maxResults = GATHER_DEPTH_RESULTS[depth]
  let search
  try {
    search = await deps.web.search({ query: topic, maxResults }, signal)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CaptureError('FETCH_FAILED', `search for ${JSON.stringify(topic)} failed: ${message}`)
  }
  const candidates: GatherCandidate[] = []
  const gaps: string[] = []
  for (const source of search.sources) {
    try {
      const snapshot = await captureFromWeb(deps, source.url, signal)
      const record = await register({
        title: source.title ?? source.url,
        origin: snapshot.origin,
        content: snapshot.content,
      })
      candidates.push({
        url: source.url,
        ...(source.title === undefined ? {} : { title: source.title }),
        ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
        status: 'captured',
        evidenceId: record.id,
      })
    } catch (error) {
      const reason = error instanceof CaptureError ? `${error.code}: ${error.message}` : String(error)
      candidates.push({
        url: source.url,
        ...(source.title === undefined ? {} : { title: source.title }),
        ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
        status: 'uncaptured',
        reason,
      })
      gaps.push(`no snapshot for ${source.url} (${reason}) — add it with evidence_add once content is available`)
    }
  }
  if (search.truncated) gaps.push(`search returned more than ${maxResults} sources; only the top ${maxResults} were considered`)
  if (candidates.every(candidate => candidate.status === 'uncaptured')) {
    gaps.push('no evidence was captured; the report cannot be assembled until at least one snapshot lands in the ledger')
  }
  return { topic, candidates, gaps }
}
