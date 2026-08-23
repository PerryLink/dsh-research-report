/**
 * Deterministic DOI syntax validation — zero network. A DOI origin is
 * recognized (bare `10.…`, a `doi:` URN, or a `doi.org` / `dx.doi.org` URL),
 * normalized to its canonical `10.xxxx/xxxx` form, and checked against the
 * DOI Handbook structure: a 4–9 digit registrant code after `10.`, a `/`, and
 * a non-empty suffix drawn from the DOI character set `[A-Za-z0-9._;()/-]`.
 *
 * Three deterministic constraints (the task's contract):
 * 1. `10.xxxx/xxxx` structure regex;
 * 2. a prefix whitelist of recognized DOI resolver prefixes;
 * 3. a DOI character-set constraint.
 *
 * @module dsh-research-report/doi
 */

/** Recognized DOI resolver URL prefixes (the detection/normalization whitelist). */
const DOI_URL_PREFIXES = [
  'https://doi.org/',
  'http://doi.org/',
  'https://dx.doi.org/',
  'http://dx.doi.org/',
] as const

/** The `doi:` URN scheme prefix. */
const DOI_SCHEME_PREFIX = 'doi:'

/** Canonical structure: `10.` + 4–9 digit registrant + `/` + DOI-charset suffix. */
const DOI_STRUCTURE = /^10\.\d{4,9}\/[A-Za-z0-9._;()/-]+$/u

/** Whether `origin` is a DOI: a bare `10.…` or a recognized DOI resolver prefix. */
export function isDoiOrigin(origin: string): boolean {
  const trimmed = origin.trim()
  if (trimmed.startsWith('10.')) return true
  if (trimmed.toLowerCase().startsWith(DOI_SCHEME_PREFIX)) return true
  return DOI_URL_PREFIXES.some(prefix => trimmed.toLowerCase().startsWith(prefix.toLowerCase()))
}

/**
 * Extract the canonical `10.xxxx/xxxx` DOI from an origin string, stripping
 * any recognized resolver prefix.
 * @param origin - the origin string.
 * @returns the canonical DOI, or undefined when the origin is not a DOI.
 */
export function normalizeDoi(origin: string): string | undefined {
  const trimmed = origin.trim()
  const lower = trimmed.toLowerCase()
  for (const prefix of DOI_URL_PREFIXES) {
    if (lower.startsWith(prefix.toLowerCase())) return trimmed.slice(prefix.length)
  }
  if (lower.startsWith(DOI_SCHEME_PREFIX)) return trimmed.slice(DOI_SCHEME_PREFIX.length)
  if (trimmed.startsWith('10.')) return trimmed
  return undefined
}

/** The outcome of {@link validateDoi}. */
export type DoiValidation = { valid: true; doi: string } | { valid: false; reason: string }

/**
 * Deterministically validate one DOI origin (no network). A valid DOI returns
 * its canonical form; an invalid one returns the concrete reason.
 * @param origin - the origin string.
 * @returns the validation outcome.
 */
export function validateDoi(origin: string): DoiValidation {
  const doi = normalizeDoi(origin)
  if (doi === undefined) {
    return {
      valid: false,
      reason: `origin ${JSON.stringify(origin)} is not a DOI (expected 10.xxxx/xxxx, a doi: URN, or a doi.org / dx.doi.org URL)`,
    }
  }
  if (DOI_STRUCTURE.test(doi)) return { valid: true, doi }
  if (!/^10\.\d{4,9}\//u.test(doi)) {
    return { valid: false, reason: `DOI ${JSON.stringify(doi)} must match "10.<4-9 digit registrant>/<suffix>"` }
  }
  return { valid: false, reason: `DOI ${JSON.stringify(doi)} contains characters outside the DOI set [A-Za-z0-9._;()/-]` }
}
