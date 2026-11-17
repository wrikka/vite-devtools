import type { AuditsDeps } from '../deps'
import { exportedIdentifiers, relativeImports, resolveRelative } from '../domain/import-graph'
import { CODE_EXT } from '../../../contracts/source-scan'

export { relativeImports, exportedIdentifiers, resolveRelative }

export interface ImportFileRow {
  file: string
  importers: string[]
  imports: string[]
}

export interface ImportsAuditReport {
  root: string
  scanned: number
  truncated: boolean
  edges: number
  files: ImportFileRow[]
  unused: { file: string; name: string }[]
  unresolved: { file: string; specifier: string }[]
}

export async function auditImports(deps: AuditsDeps, dir?: string): Promise<ImportsAuditReport> {
  const scan = await deps.scanner.scan({ dir, exts: new Set([...CODE_EXT]) })
  const known = new Set(scan.files.map((f) => f.rel))
  const importers = new Map<string, Set<string>>()
  const imports = new Map<string, string[]>()
  const unresolved: { file: string; specifier: string }[] = []
  let edges = 0

  for (const file of scan.files) {
    const specs = relativeImports(file.text)
    const resolved: string[] = []
    for (const spec of specs) {
      const target = resolveRelative(file.rel, spec, known)
      if (!target) {
        if (unresolved.length < 50) unresolved.push({ file: file.rel, specifier: spec })
        continue
      }
      if (target === file.rel) continue
      resolved.push(target)
      edges++
      const set = importers.get(target) ?? new Set<string>()
      set.add(file.rel)
      importers.set(target, set)
    }
    imports.set(file.rel, resolved)
  }

  const unused: { file: string; name: string }[] = []
  const texts = new Map(scan.files.map((f) => [f.rel, f.text]))
  for (const file of scan.files) {
    for (const name of exportedIdentifiers(file.text)) {
      const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`)
      let used = false
      for (const [rel, text] of texts) {
        if (rel === file.rel) continue
        if (word.test(text)) {
          used = true
          break
        }
      }
      if (!used && unused.length < 200) unused.push({ file: file.rel, name })
    }
  }

  const files = scan.files
    .map((f) => ({
      file: f.rel,
      importers: [...(importers.get(f.rel) ?? [])].slice(0, 8),
      imports: (imports.get(f.rel) ?? []).slice(0, 8),
    }))
    .sort((a, b) => a.importers.length - b.importers.length || a.file.localeCompare(b.file))
    .slice(0, 200)

  return { root: scan.dir, scanned: scan.files.length, truncated: scan.truncated, edges, files, unused, unresolved }
}
