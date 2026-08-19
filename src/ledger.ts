/**
 * The evidence ledger: a content-addressed snapshot store with JSONL journals.
 *
 * Layout under the configured `ledgerRoot`:
 * - `objects/<sha256>` — one immutable snapshot per content hash (same content
 *   is stored exactly once; an "update" is a new object, history is never
 *   rewritten).
 * - `index.jsonl` — evidence registrations: id → hash, origin, capturedAt,
 *   title, bytes. Append-only.
 * - `claims.jsonl` — claim registrations: id → text, evidenceIds, optional
 *   dataset bridge fields. Append-only.
 * - `verdicts.jsonl` — verification verdicts; the latest line per claim wins.
 *
 * Tamper detection is the point of the design: every content read recomputes
 * the SHA-256 of the object file and compares it against the indexed hash —
 * a mismatch surfaces as `tampered`, a deleted object as `missing`.
 *
 * This module is pure Node (zero DSH imports) so it stays testable in
 * isolation; policy (size caps, fetch) lives in the provider.
 *
 * @module dsh-research-report/ledger
 */

import { createHash, randomBytes } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** SHA-256 hex of one UTF-8 string. */
export function sha256Of(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/** Error codes the ledger reports. */
export type LedgerErrorCode = 'ID_CONFLICT' | 'JOURNAL_CORRUPT' | 'IO'

/** A loud ledger failure (audit state must never degrade silently). */
export class LedgerError extends Error {
  /** The machine-routable failure code. */
  readonly code: LedgerErrorCode
  constructor(code: LedgerErrorCode, message: string) {
    super(message)
    this.name = 'LedgerError'
    this.code = code
  }
}

/** One line of `index.jsonl` — the durable evidence record. */
export interface LedgerIndexLine {
  id: string
  hash: string
  title: string
  origin: string
  capturedAt: string
  bytes: number
}

/** One line of `claims.jsonl` — the durable claim registration. */
export interface LedgerClaimLine {
  id: string
  text: string
  evidenceIds: string[]
  dataset?: string
  citations?: Array<{ id: string; path: string; value: number | string; tolerance?: number }>
  registeredAt: string
}

/** One line of `verdicts.jsonl` — the durable verdict record. */
export interface LedgerVerdictLine {
  claimId: string
  status: 'verified' | 'unverified' | 'contradicted'
  note?: string
  at: string
}

/** Outcome of one {@link EvidenceLedger.putEvidence}. */
export interface PutOutcome {
  /** The durable record (the existing one when deduplicated). */
  record: LedgerIndexLine
  /** True when this call appended a new registration. */
  created: boolean
}

/** Read one JSONL journal; a corrupt line fails loud with file and line number. */
async function readJournal<T>(file: string): Promise<T[]> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    // A not-yet-created journal is an empty journal; anything else is loud.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw new LedgerError('IO', `cannot read journal ${file}: ${(error as Error).message}`)
  }
  const lines: T[] = []
  const rows = text.split('\n')
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    if (row.trim() === '') continue
    try {
      lines.push(JSON.parse(row) as T)
    } catch {
      throw new LedgerError('JOURNAL_CORRUPT', `corrupt JSONL at ${file}:${index + 1}`)
    }
  }
  return lines
}

/**
 * The content-addressed evidence ledger. Writes are serialized through an
 * internal promise queue so concurrent tool calls cannot interleave journals.
 */
export class EvidenceLedger {
  /** Absolute ledger root directory. */
  readonly root: string

  /** Write serialization chain (never rejects — each link absorbs the previous error). */
  private queue: Promise<void> = Promise.resolve()

  /**
   * @param root - absolute ledger root directory.
   */
  constructor(root: string) {
    this.root = root
  }

  private get objectsDir(): string {
    return path.join(this.root, 'objects')
  }

  private get indexFile(): string {
    return path.join(this.root, 'index.jsonl')
  }

  private get claimsFile(): string {
    return path.join(this.root, 'claims.jsonl')
  }

  private get verdictsFile(): string {
    return path.join(this.root, 'verdicts.jsonl')
  }

  /** Run `work` after all previously queued writes settle. */
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work)
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /** Ensure the directory layout exists. */
  private async ensureLayout(): Promise<void> {
    await mkdir(this.objectsDir, { recursive: true })
  }

  /** Write one snapshot object atomically (tmp + rename); no-op when present. */
  private async writeObject(hash: string, content: string): Promise<void> {
    const target = path.join(this.objectsDir, hash)
    try {
      await readFile(target)
      return // object exists — content-addressed storage is immutable
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new LedgerError('IO', `cannot stat object ${hash}: ${(error as Error).message}`)
      }
    }
    const temporary = path.join(this.objectsDir, `.${hash}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`)
    await writeFile(temporary, content, 'utf8')
    try {
      await rename(temporary, target)
    } catch (error) {
      // A concurrent writer may have won the rename; the object is identical
      // either way (same hash ⇒ same content), so only non-exists errors matter.
      try {
        await readFile(target)
      } catch {
        throw new LedgerError('IO', `cannot commit object ${hash}: ${(error as Error).message}`)
      }
    }
  }

  /**
   * Register one evidence snapshot. Same content dedupes to the stored object;
   * a caller-chosen id that already exists with DIFFERENT content is refused
   * loudly (history is never rewritten).
   * @param input - id (optional), title, origin, content, capturedAt.
   * @returns the record plus whether this call created it.
   */
  async putEvidence(input: {
    id?: string
    title: string
    origin: string
    content: string
    capturedAt: string
  }): Promise<PutOutcome> {
    return this.enqueue(async () => {
      await this.ensureLayout()
      const hash = sha256Of(input.content)
      const id = input.id ?? `ev-${hash.slice(0, 12)}`
      const index = await readJournal<LedgerIndexLine>(this.indexFile)
      const existing = index.find(line => line.id === id)
      if (existing !== undefined) {
        if (existing.hash !== hash) {
          throw new LedgerError(
            'ID_CONFLICT',
            `evidence id "${id}" is already registered with different content (indexed ${existing.hash}, new ${hash}); choose a new id — snapshots are immutable`,
          )
        }
        return { record: existing, created: false }
      }
      await this.writeObject(hash, input.content)
      const record: LedgerIndexLine = {
        id,
        hash,
        title: input.title,
        origin: input.origin,
        capturedAt: input.capturedAt,
        bytes: Buffer.byteLength(input.content, 'utf8'),
      }
      await appendFile(this.indexFile, `${JSON.stringify(record)}\n`, 'utf8')
      return { record, created: true }
    })
  }

  /**
   * Register claims (id → text, evidenceIds). Re-registering a claim id with
   * a different text or different bindings is refused loudly.
   * @param claims - the registrations to append.
   * @param registeredAt - ISO-8601 registration time.
   * @returns the durable claim lines (existing lines for idempotent repeats).
   */
  async registerClaims(
    claims: Array<Omit<LedgerClaimLine, 'registeredAt'>>,
    registeredAt: string,
  ): Promise<LedgerClaimLine[]> {
    return this.enqueue(async () => {
      await this.ensureLayout()
      const journal = await readJournal<LedgerClaimLine>(this.claimsFile)
      const out: LedgerClaimLine[] = []
      for (const claim of claims) {
        const existing = journal.find(line => line.id === claim.id)
        if (existing !== undefined) {
          const same = existing.text === claim.text
            && JSON.stringify(existing.evidenceIds) === JSON.stringify(claim.evidenceIds)
            && existing.dataset === claim.dataset
          if (!same) {
            throw new LedgerError(
              'ID_CONFLICT',
              `claim id "${claim.id}" is already registered with different text or bindings; choose a new claim id — registrations are immutable`,
            )
          }
          out.push(existing)
          continue
        }
        const line: LedgerClaimLine = { ...claim, registeredAt }
        await appendFile(this.claimsFile, `${JSON.stringify(line)}\n`, 'utf8')
        journal.push(line)
        out.push(line)
      }
      return out
    })
  }

  /**
   * Append one verdict (latest per claim wins on read).
   * @param verdict - claimId, status, optional note.
   * @param at - ISO-8601 write time.
   */
  async recordVerdict(verdict: Omit<LedgerVerdictLine, 'at'>, at: string): Promise<void> {
    await this.enqueue(async () => {
      await this.ensureLayout()
      const line: LedgerVerdictLine = { ...verdict, at }
      await appendFile(this.verdictsFile, `${JSON.stringify(line)}\n`, 'utf8')
    })
  }

  /**
   * Read the evidence index.
   * @returns every registration in append order.
   */
  async listEvidence(): Promise<LedgerIndexLine[]> {
    return readJournal<LedgerIndexLine>(this.indexFile)
  }

  /**
   * Read one evidence registration.
   * @param id - the ledger id.
   * @returns the record, or undefined when unknown.
   */
  async getEvidence(id: string): Promise<LedgerIndexLine | undefined> {
    const index = await this.listEvidence()
    return index.find(line => line.id === id)
  }

  /**
   * Read every claim registration.
   * @returns every claim in append order.
   */
  async listClaims(): Promise<LedgerClaimLine[]> {
    return readJournal<LedgerClaimLine>(this.claimsFile)
  }

  /**
   * Read one claim registration.
   * @param id - the claim id.
   * @returns the claim line, or undefined when unknown.
   */
  async getClaim(id: string): Promise<LedgerClaimLine | undefined> {
    const claims = await this.listClaims()
    return claims.find(line => line.id === id)
  }

  /**
   * Fold the verdict journal to the latest verdict per claim.
   * @returns claimId → latest stored verdict.
   */
  async latestVerdicts(): Promise<Map<string, LedgerVerdictLine>> {
    const journal = await readJournal<LedgerVerdictLine>(this.verdictsFile)
    const latest = new Map<string, LedgerVerdictLine>()
    for (const line of journal) latest.set(line.claimId, line)
    return latest
  }

  /**
   * Read one snapshot and recompute its hash — the tamper-detection path.
   * @param id - the ledger id.
   * @returns content plus integrity (`ok` | `tampered` | `missing`), or
   *   undefined when the id is unknown.
   */
  async readContent(id: string): Promise<{ content: string; integrity: 'ok' | 'tampered' | 'missing' } | undefined> {
    const record = await this.getEvidence(id)
    if (record === undefined) return undefined
    let content: string
    try {
      content = await readFile(path.join(this.objectsDir, record.hash), 'utf8')
    } catch (error) {
      // A deleted object degrades to the `missing` integrity state, never an
      // unhandled failure; anything else is loud.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { content: '', integrity: 'missing' }
      throw new LedgerError('IO', `cannot read object ${record.hash}: ${(error as Error).message}`)
    }
    return { content, integrity: sha256Of(content) === record.hash ? 'ok' : 'tampered' }
  }
}
