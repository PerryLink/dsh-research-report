/**
 * The `tool/result.meta` projection is a declared sibling surface (see the
 * module doc in `src/service.ts`): exactly two absolute artifact paths, present
 * only for a sealed result. An out-of-tree consumer joins `tool/call` to
 * `tool/result` and cannot reproduce our cwd resolution, so a silent rename
 * here would break it with no CI signal on either side.
 * @module dsh-research-report/test/meta-contract.spec
 */

import { describe, expect, it } from 'vitest'
import { sealedMeta } from '../src/tools/research-report.ts'
import path from 'node:path'

describe('sibling meta projection', () => {
  it('exposes exactly the two absolute artifact paths, never a directory', () => {
    const value = {
      reportFile: path.resolve('/w/sealed/report.md'),
      manifestFile: path.resolve('/w/sealed/manifest.json'),
    }
    const meta = sealedMeta(value as never)

    expect(Object.keys(meta).sort()).toEqual(['manifestFile', 'reportFile'])
    expect(path.isAbsolute(meta.reportFile)).toBe(true)
    expect(path.isAbsolute(meta.manifestFile)).toBe(true)
    expect(path.basename(meta.reportFile)).toBe('report.md')
    expect(path.basename(meta.manifestFile)).toBe('manifest.json')
  })
})
