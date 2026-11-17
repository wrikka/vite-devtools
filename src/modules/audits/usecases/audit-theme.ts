import { dirname, join, resolve } from 'node:path'
import type { AuditsDeps } from '../deps'
import {
  classNameTokens,
  classifyColorUtility,
  flattenObjectKeys,
  objectBody,
  themeTokens,
  type ThemeAuditReport,
  type UtilityKind,
  type UtilityRow,
} from '../domain/theme-parse'
import type { SourceFile } from '../../../contracts/source-scan'
import { CODE_EXT } from '../../../contracts/source-scan'
import { relFromRoot } from '../../../core/paths'

export {
  arbitraryIsColor,
  objectBody,
  splitTopLevel,
  flattenObjectKeys,
  classNameTokens,
  classifyColorUtility,
  themeTokens,
} from '../domain/theme-parse'
export type { UtilityKind, UtilityRow, ThemeAuditReport } from '../domain/theme-parse'

/** `theme: { colors: themeColors }` almost always points at a palette in another module. */
const PALETTE_SYMBOLS = new Set(['themeColors', 'colors'])
const IMPORT = /import\s+(?:type\s+)?(?:\{([^}]*)\}|([A-Za-z_$][\w$]*))\s+from\s+['"]([^'"]+)['"]/g
const MAX_PALETTE_FILES = 8
const MAX_PALETTE_BYTES = 512 * 1024

async function resolveModule(deps: AuditsDeps, base: string): Promise<string | undefined> {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, join(base, 'index.ts')]
  for (const path of candidates) {
    if (!CODE_EXT.has(path.slice(path.lastIndexOf('.')))) continue
    try {
      if ((await deps.fs.stat(path)).isFile()) return path
    } catch {
      /* try the next candidate */
    }
  }
  return undefined
}

/**
 * Reads the modules a scanned file imports its palette from, so a palette kept in a
 * shared package still counts as declared. Relative specifiers only, source files
 * only, at most `MAX_PALETTE_FILES` hops — never `node_modules`.
 */
export async function paletteModules(deps: AuditsDeps, files: SourceFile[]): Promise<SourceFile[]> {
  const root = deps.server.root()
  const seen = new Set(files.map((f) => f.full))
  const extra: SourceFile[] = []
  const queue = [...files]
  while (queue.length > 0 && extra.length < MAX_PALETTE_FILES) {
    const file = queue.shift()!
    for (const m of file.text.matchAll(IMPORT)) {
      const named = m[1]
      const bound = named
        ? named.split(',').some((s) => PALETTE_SYMBOLS.has(s.trim().split(/\s+as\s+/)[0]!.trim()))
        : PALETTE_SYMBOLS.has(m[2] ?? '')
      if (!bound) continue
      const spec = m[3]!
      if (!spec.startsWith('.')) continue
      const path = await resolveModule(deps, resolve(dirname(file.full), spec))
      if (!path || seen.has(path) || path.includes('/node_modules/')) continue
      try {
        if ((await deps.fs.stat(path)).size > MAX_PALETTE_BYTES) continue
        const next: SourceFile = { rel: relFromRoot(root, path), full: path, text: await deps.fs.readFile(path, 'utf8') }
        seen.add(path)
        extra.push(next)
        queue.push(next)
      } catch {
        /* unreadable palette module — keep auditing with what the scan has */
      }
    }
  }
  return extra
}

export async function auditTheme(deps: AuditsDeps, dir?: string): Promise<ThemeAuditReport> {
  const scan = await deps.scanner.scan({ dir })
  const palette = await paletteModules(deps, scan.files)
  const tokens = themeTokens([...scan.files, ...palette])
  const known = new Set(tokens)
  const agg = new Map<string, { count: number; files: Set<string>; kind: UtilityKind; dark: boolean }>()

  for (const file of scan.files) {
    for (const name of classNameTokens(file.text)) {
      const hit = classifyColorUtility(name, known)
      if (!hit) continue
      const row = agg.get(name) ?? { count: 0, files: new Set<string>(), kind: hit.kind, dark: hit.dark }
      row.count++
      row.files.add(file.rel)
      agg.set(name, row)
    }
  }

  const rows: UtilityRow[] = [...agg.entries()]
    .map(([name, r]) => ({
      name,
      count: r.count,
      files: [...r.files].slice(0, 5),
      kind: r.kind,
      dark: r.dark,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    root: scan.dir,
    hasTheme: tokens.length > 0,
    tokens,
    scanned: scan.files.length,
    truncated: scan.truncated,
    utilities: rows.slice(0, 120),
    violations: rows
      .filter((r) => r.dark || r.kind === 'palette' || r.kind === 'arbitrary' || r.kind === 'unknown')
      .slice(0, 60),
  }
}
