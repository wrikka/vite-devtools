import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { assertCan } from '../../core/access'
import { listTests as scanTests, runTest as runProjectTest } from '../../modules/scans'
import type { TestsReport } from '../../modules/scans'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { processTestRunner } from '../../infra/process-test-runner'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

const scansDeps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

export const listTests = defineRpcFunction({
  name: 'list-tests',
  type: 'query',
  agent: {
    description: 'Find test files and the source file each one covers, plus source files that have no adjacent test',
  },
  args: [z.object({ dir: z.string().optional() })],
  returns: z.object({
    root: z.string(),
    tests: z.array(z.object({ file: z.string(), matches: z.array(z.string()) })),
    untested: z.array(z.string()),
    runner: z.string(),
  }),
  handler: async ({ dir } = {}): Promise<TestsReport> => scanTests(scansDeps, dir),
})

export const runTest = defineRpcFunction({
  name: 'run-test',
  type: 'action',
  jsonSerializable: true,
  agent: {
    description: 'Run a single test file with the project runner (bun test / vitest / jest / node --test) and return its output',
  },
  args: [z.object({ file: z.string() })],
  returns: z.object({
    file: z.string(),
    runner: z.string(),
    ok: z.boolean(),
    code: z.number(),
    durationMs: z.number(),
    output: z.string(),
  }),
  handler: async ({ file }) => {
    assertCan('test:run')
    return runProjectTest({ runner: processTestRunner, server: viteServerContext, fs: nodeProjectFs }, file)
  },
})

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro']
