import { join } from 'node:path'
import { isInside } from '../../../core/paths'
import type { ProjectFs } from '../../../core/ports/project-fs'
import type { TestRunOutcome, TestRunner } from '../../../core/ports/test-runner'
import type { ViteServerContext } from '../../../core/ports/vite-server'

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/

export type RunTestResult = TestRunOutcome

export async function runTest(
  deps: { runner: TestRunner; server: ViteServerContext; fs: ProjectFs },
  file: string,
): Promise<RunTestResult> {
  const root = deps.server.root()
  const full = join(root, file)
  if (!isInside(root, full) || !TEST_FILE.test(file)) throw new Error('only test files inside the project can run')
  const exists = await deps.fs.stat(full).then(() => true).catch(() => false)
  if (!exists) throw new Error(`${file} does not exist`)
  return deps.runner.run(file)
}
