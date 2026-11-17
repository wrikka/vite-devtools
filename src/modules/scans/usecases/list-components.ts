import { join, relative, resolve, sep } from 'node:path'
import type { ComponentRow, ComponentsReport } from '../../../contracts/components'
import type { ScansDeps } from '../deps'
import { exportedNames, kindOf } from '../domain/component-parse'
import { extOf } from '../../../core/paths'

const MAX_FILES = 3000
const MAX_FILE_SIZE = 512 * 1024

const IGNORE = new Set(['node_modules', 'dist', 'build', '.git', '.output', 'coverage', '.next', '.nuxt', '.svelte-kit', 'dev-dist'])
const SRC = new Set(['.ts', '.tsx', '.js', '.jsx', '.svelte', '.vue'])

export async function listComponents(deps: ScansDeps, dir = 'src'): Promise<ComponentsReport> {
  const root = resolve(deps.server.root())
  const base = resolve(root, dir)
  const files: { rel: string; full: string; text: string }[] = []
  let truncated = false

  async function walk(at: string): Promise<void> {
    if (truncated) return
    for (const d of await deps.fs.readdir(at, { withFileTypes: true })) {
      if (files.length >= MAX_FILES) {
        truncated = true
        return
      }
      const full = join(at, d.name)
      if (d.isDirectory()) {
        if (!IGNORE.has(d.name) && !d.name.startsWith('.')) await walk(full)
      } else if (d.isFile() && SRC.has(extOf(d.name)) && !d.name.endsWith('.test.tsx') && !d.name.endsWith('.stories.tsx')) {
        const info = await deps.fs.stat(full)
        if (info.size > MAX_FILE_SIZE) continue
        files.push({ rel: relative(root, full).split(sep).join('/'), full, text: await deps.fs.readFile(full, 'utf8') })
      }
    }
  }

  try {
    await walk(base)
  } catch {
    /* missing src dir — report an empty inventory instead of throwing */
  }

  const components: ComponentRow[] = []
  for (const f of files) {
    const names = exportedNames(f.text).filter((n) => /^[A-Z]/.test(n) || /^use[A-Z]/.test(n))
    if (names.length === 0) continue
    const loc = f.text.split('\n').length
    for (const name of names) {
      const word = new RegExp(`\\b${name}\\b`)
      const refs = files.reduce((n, other) => (other.rel === f.rel ? n : word.test(other.text) ? n + 1 : n), 0)
      components.push({ file: f.rel, name, exports: names, loc, refs, kind: kindOf(f.rel, name) })
    }
  }
  components.sort((a, b) => a.refs - b.refs || b.loc - a.loc || a.name.localeCompare(b.name))
  return { root: dir, components, truncated }
}
