import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { TestRunner } from '../core/ports/test-runner'
import { projectRoot } from './vite-server-context'

const RUN_TIMEOUT = 120_000
const OUTPUT_CAP = 20_000

async function exists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function pickRunner(root: string, file: string): Promise<{ label: string; bin: string; args: string[] }> {
  if (process.versions.bun) return { label: 'bun test', bin: process.execPath, args: ['test', file] }
  const vitest = join(root, 'node_modules', 'vitest', 'vitest.mjs')
  if (await exists(vitest)) return { label: 'vitest', bin: process.execPath, args: [vitest, 'run', file] }
  const jest = join(root, 'node_modules', 'jest', 'bin', 'jest.js')
  if (await exists(jest)) return { label: 'jest', bin: process.execPath, args: [jest, '--runTestsByPath', file] }
  return { label: 'node --test', bin: process.execPath, args: ['--test', file] }
}

export const processTestRunner: TestRunner = {
  async run(file) {
    const root = projectRoot()
    const full = join(root, file)
    const runner = await pickRunner(root, full)
    const started = Date.now()
    return await new Promise((resolve) => {
      const child = spawn(runner.bin, runner.args, { cwd: root, env: process.env, windowsHide: true })
      let output = ''
      const append = (chunk: Buffer): void => {
        output += chunk.toString('utf8')
        if (output.length > OUTPUT_CAP * 2) output = output.slice(-OUTPUT_CAP)
      }
      child.stdout.on('data', append)
      child.stderr.on('data', append)
      const timer = setTimeout(() => {
        child.kill()
        output += `\n[timed out after ${RUN_TIMEOUT / 1000}s]`
      }, RUN_TIMEOUT)
      child.on('error', (err) => {
        clearTimeout(timer)
        resolve({ file, runner: runner.label, ok: false, code: -1, durationMs: Date.now() - started, output: String(err) })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve({
          file,
          runner: runner.label,
          ok: code === 0,
          code: code ?? -1,
          durationMs: Date.now() - started,
          output: output.slice(-OUTPUT_CAP),
        })
      })
    })
  },
}
