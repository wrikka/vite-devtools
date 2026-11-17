import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { CODE_EXT, WEB_EXT } from '../../contracts/source-scan'
import type { ScanOptions, SourceFile, SourceScan } from '../../contracts/source-scan'
import type { SourceScanner } from '../../core/ports/source-scanner'
import { projectRoot } from '../vite-server-context'

export { CODE_EXT, WEB_EXT }
export type { ScanOptions, SourceFile, SourceScan }

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  '.git',
  '.output',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'dev-dist',
  '.cache',
  '.turbo',
  '.vercel',
  '.idea',
  '.vscode',
  'vendor',
  'target',
])

/** Walk the served project once; every audit panel reads from this. */
export async function scanSource(options: ScanOptions = {}): Promise<SourceScan> {
  const root = projectRoot()
  const dir = options.dir ?? '.'
  const base = resolve(root, dir)
  const exts = options.exts ?? WEB_EXT
  const maxFiles = options.maxFiles ?? 3000
  const maxFileSize = options.maxFileSize ?? 512 * 1024
  const files: SourceFile[] = []
  let truncated = false

  async function walk(at: string, depth: number): Promise<void> {
    if (truncated || depth > 12) return
    let dirents
    try {
      dirents = await readdir(at, { withFileTypes: true })
    } catch {
      return
    }
    for (const d of dirents) {
      if (files.length >= maxFiles) {
        truncated = true
        return
      }
      if (d.isDirectory()) {
        if (!IGNORED_DIRS.has(d.name) && !d.name.startsWith('.')) await walk(join(at, d.name), depth + 1)
        continue
      }
      if (!d.isFile()) continue
      const dot = d.name.lastIndexOf('.')
      const ext = dot === -1 ? '' : d.name.slice(dot).toLowerCase()
      if (!exts.has(ext)) continue
      const full = join(at, d.name)
      try {
        const info = await stat(full)
        if (info.size > maxFileSize) continue
        files.push({ rel: relative(root, full).split(sep).join('/'), full, text: await readFile(full, 'utf8') })
      } catch {
        /* unreadable file — skip it, keep walking */
      }
    }
  }

  await walk(base, 0)
  files.sort((a, b) => a.rel.localeCompare(b.rel))
  return { root, dir, files, truncated }
}

export const sourceScanner: SourceScanner = { scan: scanSource }
