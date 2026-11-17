import { join, relative, resolve, sep } from 'node:path'
import type { ScansDeps } from '../deps'
import { extOf } from '../../../core/paths'

const MAX_FILES = 4000
const MAX_FILE_SIZE = 256 * 1024
const DEFAULT_LIMIT = 30

const IGNORE = new Set(['node_modules', 'dist', 'build', '.git', '.output', 'coverage', '.next', '.nuxt', '.svelte-kit'])
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.css', '.html', '.astro'])

const SCOPE_SEGMENTS: Record<string, string[]> = {
  components: ['component', 'components', 'ui', 'widget', 'widgets', 'feature', 'features'],
  routes: ['route', 'routes', 'page', 'pages', 'app', 'router', 'view', 'views'],
}

export interface SearchMatch {
  file: string
  line: number
  snippet: string
}

export interface SearchReport {
  query: string
  scope: string
  matches: SearchMatch[]
  truncated: boolean
}

export async function searchSource(
  deps: ScansDeps,
  query: string,
  scope: 'local' | 'components' | 'routes' = 'local',
  limit = DEFAULT_LIMIT,
): Promise<SearchReport> {
  const root = resolve(deps.server.root())
  const needle = query.toLowerCase()
  const segments = SCOPE_SEGMENTS[scope]
  const cap = Math.min(limit, 100)
  const matches: SearchMatch[] = []
  let visited = 0
  let truncated = false

  // `inside` once a directory itself matched a scope segment, everything below stays in scope.
  // Top-level dirs always get descended — the scope folder usually lives under `src/`.
  async function walk(dir: string, inside: boolean, depth: number): Promise<boolean> {
    const dirents = await deps.fs.readdir(dir, { withFileTypes: true })
    for (const d of dirents) {
      if (visited >= MAX_FILES) {
        truncated = true
        return false
      }
      const full = join(dir, d.name)
      if (d.isDirectory()) {
        if (IGNORE.has(d.name) || d.name.startsWith('.')) continue
        const hit = inside || depth === 0 || (segments?.includes(d.name.toLowerCase()) ?? false)
        if (segments && !hit) continue
        if (!(await walk(full, hit, depth + 1))) return false
      } else if (d.isFile()) {
        if (!EXTENSIONS.has(extOf(d.name))) continue
        visited++
        const info = await deps.fs.stat(full)
        if (info.size > MAX_FILE_SIZE) continue
        const content = await deps.fs.readFile(full, 'utf8')
        if (!content.toLowerCase().includes(needle)) continue
        const file = relative(root, full).split(sep).join('/')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length && matches.length < cap; i++) {
          const line = lines[i]!
          if (line.toLowerCase().includes(needle)) {
            matches.push({ file, line: i + 1, snippet: line.trim().slice(0, 200) })
          }
        }
        if (matches.length >= cap) {
          truncated = true
          return false
        }
      }
    }
    return true
  }

  try {
    await walk(root, false, 0)
  } catch {
    /* cwd unreadable mid-walk — return what we have */
  }
  return { query, scope, matches, truncated }
}
