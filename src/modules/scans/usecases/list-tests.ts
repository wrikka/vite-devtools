import { join } from 'node:path'
import { CODE_EXT } from '../../../contracts/source-scan'
import { isInside } from '../../../core/paths'
import type { ScansDeps } from '../deps'

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/
const RUN_TIMEOUT = 120_000
const OUTPUT_CAP = 20_000

/** `src/a/b.test.ts` pairs with `src/a/b.ts` (any source extension). */
export function testBase(file: string): string {
  return file.replace(TEST_FILE, '').replace(/\.[a-z]+$/, '')
}

export function matchSources(testFile: string, sources: string[]): string[] {
  const base = testBase(testFile)
  return sources.filter((s) => s === base || s.replace(/\.[a-z]+$/, '') === base)
}

export interface TestPair {
  file: string
  matches: string[]
}

export interface TestsReport {
  root: string
  tests: TestPair[]
  untested: string[]
  runner: string
}

export async function listTests(deps: ScansDeps, dir?: string): Promise<TestsReport> {
  const scan = await deps.scanner.scan({ dir, exts: new Set([...CODE_EXT]) })
  const sources = scan.files.filter((f) => !TEST_FILE.test(f.rel) && !f.rel.endsWith('.d.ts')).map((f) => f.rel)
  const tests = scan.files.filter((f) => TEST_FILE.test(f.rel))
  const covered = new Set(tests.flatMap((t) => matchSources(t.rel, sources)))
  const bun = Boolean(process.versions.bun)
  const root = deps.server.root()
  const hasVitest = await deps.fs
    .stat(join(root, 'node_modules', 'vitest', 'vitest.mjs'))
    .then(() => true)
    .catch(() => false)
  const runner = bun ? 'bun test' : hasVitest ? 'vitest' : 'node --test'

  return {
    root: scan.dir,
    tests: tests.map((t) => ({ file: t.rel, matches: matchSources(t.rel, sources).slice(0, 4) })),
    untested: sources
      .filter((s) => !covered.has(s) && /\.[jt]sx?$/.test(s) && !/\.config\./.test(s))
      .slice(0, 100),
    runner,
  }
}
