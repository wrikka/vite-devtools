import { posix } from 'node:path'

const RESOLVE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.svelte', '.astro', '.json']

/** Relative specifiers only: aliases and packages cannot be resolved from source alone. */
export function relativeImports(text: string): string[] {
  const out = new Set<string>()
  const patterns = [
    /\bfrom\s*['"]([^'"\n]+)['"]/g,
    /\bimport\s*['"]([^'"\n]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
    /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  ]
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const spec = m[1]!.split('?')[0]!
      if (spec.startsWith('.')) out.add(spec)
    }
  }
  return [...out]
}

/** Named exports a file offers; default exports are skipped because importers may rename them. */
export function exportedIdentifiers(text: string): string[] {
  const names = new Set<string>()
  for (const m of text.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]!)
  }
  for (const m of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    if (/\bfrom\s*['"]/.test(text.slice(m.index! + m[0].length, m.index! + m[0].length + 40))) continue
    for (const part of m[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name)
    }
  }
  return [...names]
}

export function resolveRelative(fromRel: string, spec: string, known: Set<string>): string | undefined {
  const base = posix.normalize(posix.join(posix.dirname(fromRel), spec))
  if (known.has(base)) return base
  for (const ext of RESOLVE_EXT) if (known.has(base + ext)) return base + ext
  for (const ext of RESOLVE_EXT) if (known.has(`${base}/index${ext}`)) return `${base}/index${ext}`
  return undefined
}
